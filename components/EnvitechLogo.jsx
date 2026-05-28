import Image from "next/image";

export const ENVITECH_LOGO_SRC = "/envitech-logo.png";

export default function EnvitechLogo({
  className = "h-12 w-28 object-contain",
  width = 280,
  height = 132,
  priority = false
}) {
  return (
    <Image
      src={ENVITECH_LOGO_SRC}
      alt="Envitech Perkasa"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
