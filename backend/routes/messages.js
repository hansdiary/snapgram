const router = require('express').Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const getConversationId = (a, b) => [a, b].sort().join('_');

// GET /api/messages/conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    }).sort({ createdAt: -1 }).populate('sender receiver', 'username avatar fullName');

    // Dédupliquer par conversation
    const seen = new Set();
    const conversations = [];
    for (const msg of messages) {
      const other = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const cid = getConversationId(userId, other._id.toString());
      if (!seen.has(cid)) {
        seen.add(cid);
        const unread = await Message.countDocuments({
          conversationId: cid, receiver: req.user._id, read: false,
        });
        conversations.push({ conversationId: cid, participant: other, lastMessage: msg, unread });
      }
    }
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/messages/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const cid = getConversationId(req.user._id.toString(), req.params.userId);
    const messages = await Message.find({ conversationId: cid })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar');

    // Marquer comme lus
    await Message.updateMany(
      { conversationId: cid, receiver: req.user._id, read: false },
      { read: true }
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/messages/:userId
router.post('/:userId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Message vide' });

    const cid = getConversationId(req.user._id.toString(), req.params.userId);
    const message = await Message.create({
      conversationId: cid,
      sender: req.user._id,
      receiver: req.params.userId,
      content,
    });
    const populated = await message.populate('sender', 'username avatar');

    // Émettre via Socket.IO
    const io = req.app.get('io');
    io.to(`user:${req.params.userId}`).emit('message:receive', {
      ...populated.toObject(),
      conversationId: cid,
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
