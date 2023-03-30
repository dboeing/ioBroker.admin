const CracoEsbuildPlugin = require('craco-esbuild');
const { ProvidePlugin} = require('webpack');
const cracoModuleFederation = require('craco-module-federation');

module.exports = {
    plugins: [
        { plugin: CracoEsbuildPlugin },
        { plugin: cracoModuleFederation }
    ],
    devServer: {
        proxy: {
            '/files': 'http://127.0.0.1:8081',
            '/adapter': 'http://127.0.0.1:8081',
            '/session': 'http://127.0.0.1:8081',
            '/log': 'http://127.0.0.1:8081',
            '/lib/js/crypto-js': 'http://127.0.0.1:8081'
        }
    },
    webpack: {
        output: {
            publicPath: './',
        },
        plugins: [
            // new HtmlWebpackPlugin(),
            new ProvidePlugin({
                React: 'react',
            }),
        ],
    },
};
