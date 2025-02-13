export function dispatchMouseEvent(element) {
  const mouseDownEvent = new MouseEvent("mousedown", {
    view: window,
    bubbles: true,
    cancelable: true,
  });

  const mouseUpEvent = new MouseEvent("mouseup", {
    view: window,
    bubbles: true,
    cancelable: true,
  });

  element.dispatchEvent(mouseDownEvent);
  element.dispatchEvent(mouseUpEvent);
  console.log("Mouse events dispatched.");
}
