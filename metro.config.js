const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

config.resolver.extraNodeModules = {
  ...require("node-libs-react-native"),
};

module.exports = config;
