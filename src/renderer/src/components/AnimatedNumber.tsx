import * as React from 'react';
import { motion, useSpring, useTransform, type SpringOptions } from 'framer-motion';

type AnimatedNumberProps = {
  value: number;
  className?: string;
  springOptions?: SpringOptions;
};

export const AnimatedNumber = ({
  value,
  className,
  springOptions
}: AnimatedNumberProps): React.JSX.Element => {
  const spring = useSpring(value, springOptions);
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={`tabular-nums ${className ?? ''}`}>
      {display}
    </motion.span>
  );
};
