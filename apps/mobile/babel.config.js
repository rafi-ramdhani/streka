module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 ships its worklets Babel plugin here; it must be listed last.
    plugins: ['react-native-worklets/plugin'],
  };
};
