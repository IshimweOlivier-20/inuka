import { useState } from 'react';
import { coursePhoto } from '../../config/photos';

// The picture at the top of a course card. Shows the course's own image (Admin → Courses → Thumbnail),
// otherwise the matching photo from config/photos.js. Shows nothing if there is no picture or it fails to load.
export default function CourseImage({ c, className = 'h-40', children }) {
  const [broken, setBroken] = useState(false);
  const src = broken ? null : coursePhoto(c);
  if (!src) return null;
  return (
    <div className={`relative overflow-hidden bg-brand-soft ${className}`}>
      <img src={src} alt="" loading="lazy" onError={() => setBroken(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
      {children}
    </div>
  );
}
