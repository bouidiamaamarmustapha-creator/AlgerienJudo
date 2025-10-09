import { useRef } from 'react';

const useDragScroll = () => {
  const ref = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);

  const handleMouseDown = (e) => {
    if (!ref.current) return;
    
    // Don't start dragging if the target is an input, textarea, select, or button
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'BUTTON' ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select') ||
        target.closest('button')) {
      return;
    }
    
    isDragging.current = true;
    startX.current = e.pageX - ref.current.offsetLeft;
    startY.current = e.pageY - ref.current.offsetTop;
    scrollLeft.current = ref.current.scrollLeft;
    scrollTop.current = ref.current.scrollTop;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !ref.current) return;
    
    // Only prevent default if we're actually dragging (not interacting with form elements)
    const target = e.target;
    if (!(target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.tagName === 'SELECT' || 
          target.tagName === 'BUTTON' ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select') ||
          target.closest('button'))) {
      e.preventDefault();
    }
    
    const x = e.pageX - ref.current.offsetLeft;
    const y = e.pageY - ref.current.offsetTop;
    const walkX = (x - startX.current) * 2; // Horizontal scroll speed multiplier
    const walkY = (y - startY.current) * 2; // Vertical scroll speed multiplier
    ref.current.scrollLeft = scrollLeft.current - walkX;
    ref.current.scrollTop = scrollTop.current - walkY;
  };

  const handleMouseUp = () => {
    if (!ref.current) return;
    
    // Only reset userSelect if we were actually dragging
    if (isDragging.current) {
      ref.current.style.userSelect = '';
    }
    
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    
    // Only reset userSelect if we were actually dragging
    if (isDragging.current) {
      ref.current.style.userSelect = '';
    }
    
    isDragging.current = false;
    ref.current.style.cursor = 'grab';
  };

  // Return ref with event handlers
  const dragScrollRef = (element) => {
    if (element) {
      ref.current = element;
      element.addEventListener('mousedown', handleMouseDown);
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mouseleave', handleMouseLeave);
      element.style.cursor = 'grab';
    } else if (ref.current) {
      ref.current.removeEventListener('mousedown', handleMouseDown);
      ref.current.removeEventListener('mousemove', handleMouseMove);
      ref.current.removeEventListener('mouseup', handleMouseUp);
      ref.current.removeEventListener('mouseleave', handleMouseLeave);
    }
  };

  return dragScrollRef;
};

export { useDragScroll };