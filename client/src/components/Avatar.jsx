const COLORS = {
  banana: ['#f5c518', '#1b2a4a'],
  ocean: ['#1d4e89', '#f7f4ee'],
  forest: ['#1f7a4d', '#f7f4ee'],
  sunset: ['#c65a28', '#fffaf3'],
  grape: ['#5c3d7a', '#f7f4ee'],
  slate: ['#33415c', '#f7f4ee'],
};

export default function Avatar({ name = '?', avatarKey = 'banana', size = 40 }) {
  const [background, color] = COLORS[avatarKey] || COLORS.banana;
  const initials = name.trim().slice(0, 2).toUpperCase();
  return (
    <span
      className="avatar"
      style={{ background, color, width: size, height: size, fontSize: Math.max(12, size * 0.34) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
