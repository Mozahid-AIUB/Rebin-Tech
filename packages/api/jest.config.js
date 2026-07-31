module.exports = {
  testEnvironment: "node",
  transform: { "^.+\\.tsx?$": "babel-jest" },
  setupFiles: ["<rootDir>/jest.setup.js"],
  // @react-native-async-storage/async-storage's real implementation reaches for
  // `window.localStorage` when it can't detect a native module (true under
  // plain Node Jest, since this package isn't part of core react-native and
  // isn't auto-mocked by any RN preset). The package ships an official Jest
  // mock for exactly this; see https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
  moduleNameMapper: {
    "^@react-native-async-storage/async-storage$":
      "@react-native-async-storage/async-storage/jest/async-storage-mock",
  },
};
