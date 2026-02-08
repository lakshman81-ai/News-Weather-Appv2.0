import { useEffect, useRef, useState } from 'react';

const useIntersectionObserver = ({
  threshold = 0,
  root = null,
  rootMargin = '0px',
  freezeOnceVisible = true,
} = {}) => {
  const [entry, setEntry] = useState(null);
  const frozen = entry?.isIntersecting && freezeOnceVisible;
  const nodeRef = useRef(null);

  const updateEntry = ([entry]) => {
    setEntry(entry);
  };

  useEffect(() => {
    const node = nodeRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [nodeRef, threshold, root, rootMargin, frozen]);

  return [nodeRef, entry];
};

export default useIntersectionObserver;
