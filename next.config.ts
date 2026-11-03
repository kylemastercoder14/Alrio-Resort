import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        hostname: "ufs.sh",
        protocol: "https",
      },
      {
        hostname: "utfs.io",
        protocol: "https",
      },
      {
        hostname: "r4wxy1hs65.ufs.sh",
        protocol: "https"
      },
      {
        hostname: "images.unsplash.com",
        protocol: "https"
      },
      {
        hostname: "a0.muscache.com",
        protocol: "https"
      },
      {
        hostname: "onemarketphilippines.com",
        protocol: "https"
      },
      {
        hostname: "pipsporetech.com",
        protocol: "https"
      }
    ],
  },
};

export default nextConfig;
