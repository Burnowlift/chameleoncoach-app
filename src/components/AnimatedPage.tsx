import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AnimatedPageProps {
  children: React.ReactNode;
}

const AnimatedPage = ({ children }: AnimatedPageProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {children}
    </div>
  );
};

export default AnimatedPage;
