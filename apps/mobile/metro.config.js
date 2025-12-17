const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add NativeWind support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('nativewind/dist/transformer'),
};

module.exports = config;
