const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  data: {
    type: Buffer,
    required: true,
  },
  contentType: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
});

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
  },
  images: {
    type: [imageSchema], // Store images as binary data with metadata
    required: true,
  },
  tools: {
    type: [String],
  },
  client: {
    type: String,
  },
  link: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Project", projectSchema);
