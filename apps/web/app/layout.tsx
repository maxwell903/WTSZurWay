import { QueryProvider } from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import {
  Abril_Fatface,
  Anton,
  Archivo_Black,
  Bebas_Neue,
  Bitter,
  Caveat,
  Cormorant_Garamond,
  DM_Serif_Display,
  Dancing_Script,
  Fira_Mono,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Libre_Baskerville,
  Lobster,
  Manrope,
  Montserrat,
  Oswald,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Poppins,
  Quicksand,
  Roboto_Slab,
  Source_Serif_4,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Mega font pack — 25 visually-distinct Google Fonts exposed as CSS
// variables on <html>. The TipTap toolbar's FontFamilyDropdown writes
// `font-family: var(--font-X), <fallback>` inline so the editor and the
// rendered site share a single load path. Each font loads only the
// weights the toolbar exposes (one regular + one bold for variable fonts;
// the font's only weight for single-weight display faces).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-playfair",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-dm-serif",
});
const abril = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-abril",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-cormorant",
});
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-baskerville",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-source-serif",
});
const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-roboto-slab",
});
const bitter = Bitter({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-bitter",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-poppins",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-montserrat",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-manrope",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-inter-tight",
});
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-quicksand",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-bebas",
});
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-oswald",
});
const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-anton",
});
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-archivo-black",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-caveat",
});
const pacifico = Pacifico({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-pacifico",
});
const dancingScript = Dancing_Script({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-dancing-script",
});
const lobster = Lobster({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-lobster",
});
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-permanent-marker",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
const firaMono = Fira_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-fira-mono",
});

const FONT_VARIABLES = [
  inter,
  playfair,
  dmSerif,
  abril,
  cormorant,
  baskerville,
  sourceSerif,
  robotoSlab,
  bitter,
  poppins,
  montserrat,
  manrope,
  interTight,
  quicksand,
  spaceGrotesk,
  bebas,
  oswald,
  anton,
  archivoBlack,
  caveat,
  pacifico,
  dancingScript,
  lobster,
  permanentMarker,
  jetbrainsMono,
  firaMono,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Nebula",
  description: "Generative AI website builder for Rent Manager.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={FONT_VARIABLES}>
      <body className="font-sans antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
