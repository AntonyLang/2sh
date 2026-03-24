import type { Metadata } from "next";
import { isMirrorSite } from "@/lib/site-mode";
import "./globals.css";

export function generateMetadata(): Metadata {
  const mirror = isMirrorSite();

  return {
    title: "沪语转写测试版 | 普通话转上海话汉字写法",
    description:
      "输入普通话短句，获取更常见的上海话汉字写法与多个候选版本。当前为小范围公开测试，词库会持续补充和修正。",
    robots: mirror
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
