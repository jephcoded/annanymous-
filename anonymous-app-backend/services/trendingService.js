const queue = [];

exports.enqueue = (postId) => {
  queue.push({ postId, timestamp: Date.now() });
};

exports.flush = () => {
  queue.length = 0;
};
