// expo-haptics fails to load under Jest -- its module resolution throws
// "Cannot read properties of null (reading 'match')" because the native side
// is absent, and it throws at import time, before any jest.mock in a setup
// file can intervene. Mapped by name in jest.config.js so the substitution
// happens at resolution instead.
//
// Mocked rather than transformed on principle too: a test machine has no
// vibration motor, and a button's job in a test is to call its handler.
module.exports = {
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
};
