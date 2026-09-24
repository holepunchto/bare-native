// A platform delivers no input to a view yet. Nothing is forwarded, so a
// listener is simply never called rather than being refused: the tree is the
// same everywhere, and only what reaches it differs.
module.exports = function pointer(node, native) {}
