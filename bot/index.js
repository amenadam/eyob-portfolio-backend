require("dotenv").config();
const { Telegraf, Markup, Scenes, session } = require("telegraf");
const axios = require("axios");
const sharp = require("sharp");
const mongoose = require("mongoose");

// Initialize bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for bot");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Import Project model
const Project = require("../models/Project");

// Function to process and store image in MongoDB
async function processAndStoreImage(imageBuffer, filename) {
  try {
    console.log("Processing and storing image in MongoDB...");

    // Compress and convert to buffer
    const compressedImage = await sharp(imageBuffer)
      .jpeg({ quality: 70 })
      .toBuffer();

    return {
      data: compressedImage,
      contentType: "image/jpeg",
      filename: filename,
      size: compressedImage.length,
    };
  } catch (error) {
    console.error("Image processing failed:", error.message);
    throw new Error("Failed to process image: " + error.message);
  }
}

const projectWizard = new Scenes.WizardScene(
  "project-wizard",
  async (ctx) => {
    ctx.wizard.state.images = [];
    ctx.wizard.state.tools = [];
    await ctx.reply("Let's upload a new project!\nEnter project title:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply("Enter project description:");
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.description = ctx.message.text;
    await ctx.reply(
      "Choose the category:",
      Markup.keyboard([
        ["Logo Design", "Branding"],
        ["Web Design", "Illustration"],
        ["UI/UX", "Poster"],
      ]).oneTime()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    ctx.wizard.state.category = ctx.message.text;
    await ctx.reply(
      "Select tools (send one by one, type 'done' when finished):",
      Markup.keyboard(["Photoshop", "Illustrator", "Figma"]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const tool = ctx.message.text;
    if (tool.toLowerCase() === "done") {
      await ctx.reply(
        "Now upload 1–3 project images.\nSend 'finish' when done."
      );
      return ctx.wizard.next();
    } else {
      ctx.wizard.state.tools.push(tool);
      await ctx.reply(`✅ Added: ${tool}\nSend another tool or type 'done'.`);
    }
  },
  async (ctx) => {
    if (ctx.message.text && ctx.message.text.toLowerCase() === "finish") {
      if (ctx.wizard.state.images.length === 0) {
        await ctx.reply(
          "⚠️ Please upload at least one image before finishing."
        );
        return;
      }

      try {
        // Prepare project data
        const projectData = {
          title: ctx.wizard.state.title,
          description: ctx.wizard.state.description,
          category: ctx.wizard.state.category,
          tools: ctx.wizard.state.tools,
          images: ctx.wizard.state.images, // array of image objects
        };

        console.log("Creating project in MongoDB...");

        // Create project in MongoDB
        const project = new Project(projectData);
        await project.save();

        console.log("Project created successfully:", project._id);

        await ctx.reply(
          "✅ Project uploaded successfully!",
          Markup.removeKeyboard()
        );
      } catch (err) {
        console.error("Project upload failed:", err.message);
        await ctx.reply("❌ Failed to upload project. Please try again later.");
      }

      return ctx.scene.leave();
    }

    if (ctx.message.photo) {
      try {
        const photoId = ctx.message.photo.pop().file_id;
        const fileLink = await ctx.telegram.getFileLink(photoId);

        console.log("Downloading image from Telegram...");

        // Download image
        const response = await axios.get(fileLink.href, {
          responseType: "arraybuffer",
          timeout: 30000,
        });

        // Process and store image
        const filename = `project_image_${Date.now()}.jpg`;
        const processedImage = await processAndStoreImage(
          response.data,
          filename
        );

        ctx.wizard.state.images.push(processedImage);

        await ctx.reply(
          `✅ Image added (${ctx.wizard.state.images.length}/3)\nSend another or type 'finish'.`
        );
      } catch (err) {
        console.error("Image processing error:", err.message);
        await ctx.reply("❌ Failed to process image. Please try again.");
      }
    } else {
      await ctx.reply("Please upload a photo or type 'finish'.");
    }
  }
);

const stage = new Scenes.Stage([projectWizard]);
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => ctx.scene.enter("project-wizard"));

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply("An error occurred. Please try again.");
});

const startBot = async () => {
  try {
    await connectDB();
    bot.launch();
    console.log("Bot started with MongoDB image storage");
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
};

// Handle graceful shutdown
process.once("SIGINT", () => {
  mongoose.connection.close();
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  mongoose.connection.close();
  bot.stop("SIGTERM");
});

module.exports = startBot;
