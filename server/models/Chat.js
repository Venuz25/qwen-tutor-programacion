const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    title: { type: String, default: "Nuevo Chat" },
    messages: [
        {
            role: { type: String, enum: ['user', 'assistant', 'system'] },
            content: { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', ChatSchema);