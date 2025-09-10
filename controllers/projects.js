const Project = require("../models/Project");
const axios = require("axios");

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({}).select("-images.data");
    res.status(200).json({ projects });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: error });
  }
};

const getProjectImage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project || !project.images[req.params.imageIndex]) {
      return res.status(404).json({ msg: "Image not found" });
    }

    const image = project.images[req.params.imageIndex];
    res.set("Content-Type", image.contentType || "image/jpeg");
    res.set("Content-Length", image.size);
    res.set("Content-Disposition", `inline; filename="${image.filename}"`);

    res.send(Buffer.from(image.data));
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: error });
  }
};

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

const createProject = async (req, res) => {
  try {
    const project = await Project.create(req.body);

   
    const BASE_URL = "https://eyob-portfolio-backend.vercel.app";

    // Generate URLs for all images
    const imagesWithUrl = project.images.map((img, index) => ({
      ...img.toObject(),
      url: `${BASE_URL}/api/projects/${project._id}/images/${index}`,
    }));

    // Prepare caption (first image only)
    const caption = `
🚀 *New Project Uploaded!*  
📌 *Title:* ${project.title}  
🖼 *Category:* ${project.category}  
🛠 *Tools:* ${project.tools?.join(", ") || "N/A"}  
👤 *Client:* ${project.client || "N/A"}  
    `;

    if (imagesWithUrl.length > 1) {
      // Multiple images → sendMediaGroup
      const media = imagesWithUrl.map((img, index) => ({
        type: "photo",
        media: img.url,
        ...(index === 0 && { caption, parse_mode: "Markdown" }),
      }));

      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
        {
          chat_id: TELEGRAM_CHANNEL_ID,
          media,
        }
      );
    } else {
      // Single image → sendPhoto
      const imageUrl =
        imagesWithUrl[0]?.url || "https://via.placeholder.com/600";

      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
        {
          chat_id: TELEGRAM_CHANNEL_ID,
          photo: imageUrl,
          caption,
          parse_mode: "Markdown",
        }
      );
    }

    res.status(201).json({
      project: {
        ...project.toObject(),
        images: imagesWithUrl,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: error.message });
  }
};

module.exports = { getProjects, createProject, getProjectImage };


