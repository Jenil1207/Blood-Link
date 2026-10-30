const { EventEmitter } = require('node:events');
const Notification = require('../models/Notification');
const events = new EventEmitter();
events.setMaxListeners(0);
const channel = (type, id) => `${type}:${id}`;
async function notify(session, recipientType, recipientId, type, message, resourceId) {
  const [notification] = await Notification.create([{ recipientId, recipientType, type, message, resourceId }], { session });
  return notification;
}
function publish(notifications = []) {
  for (const n of notifications) events.emit(channel(n.recipientType, n.recipientId), n);
}
module.exports = { events, channel, notify, publish };
