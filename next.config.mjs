/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não expõe "X-Powered-By: Next.js"

  images: {
    remotePatterns: [
      // Fotos dos depoimentos (placeholder). Troque pelas fotos reais dos
      // alunos quando tiver — nesse caso, pode remover esse domínio daqui.
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },

  // Cabeçalhos de segurança aplicados a TODAS as rotas.
  // Complementam (não substituem) as checagens feitas em middleware.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
