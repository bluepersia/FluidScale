declare const fluidScale: (...args: any[]) => any;

export type InlineStyle = {
    undo: () => void
  };

declare const setInlineStyle: (el:any, styles:object) => InlineStyle;
declare const removeInlineStyle: (el, keys:string[]) => void;
export {setInlineStyle, removeInlineStyle};
export default fluidScale;
