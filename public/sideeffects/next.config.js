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

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/register/phone",
        destination: "/mypage/init",
        permanent: true, // 308
      },
    ];
  },
};

export default nextConfig;
