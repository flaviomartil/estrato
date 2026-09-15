export const palettes={
  paper:{bg:'#f4f2eb',panel:'#fffef9',ink:'#292e27',muted:'#6b7267',line:'#d7dbce',accent:'#606e47',soft:'#edf0e4',warm:'#966549',warning:'#945e35',node:'#fffef9'},
  limestone:{bg:'#f1f2ef',panel:'#ffffff',ink:'#26332d',muted:'#69786f',line:'#d6ddd5',accent:'#4c705f',soft:'#e8efeb',warm:'#806951',warning:'#88602b',node:'#ffffff'},
  graphite:{bg:'#191e1a',panel:'#222921',ink:'#e8eddf',muted:'#a4afa0',line:'#3d473a',accent:'#bbca99',soft:'#303b2a',warm:'#d3b18c',warning:'#d7ae74',node:'#252e24'}
};
export const variables = theme=>Object.entries(palettes[theme]||palettes.paper).map(([k,v])=>`--${k}:${v}`).join(';');
export const themeCSS = Object.keys(palettes).map(k=>`[data-theme="${k}"]{${variables(k)}}`).join('\n');
