import { FC, useEffect } from 'react';

export const Title: FC<{ children: string; }> = ({ children }) => {
  useEffect(() => {
    document.title = children;
    return () => { document.title = ""; };
  }, []);
  return <></>;
};
