/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/sideeffects",
        destination: "/sideeffects/",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
