![Tool Logo](./assets/logo.jpg)

Welcome to FluidScale, a JS runtime style engine that applies pixel-perfect fluid scaling to your CSS.

Write:

```css
@media (min-width: 375px) {
  /* Set the baseline minimum to scale from */
}
.recipe-card {
  padding: 2rem;
}

@media (min-width: 768px) {
  padding: 4rem;
}
```

And FluidScale will ensure your content scales with screen size.

## 🚀 Usage

In JS:

```js
import fluidScale from 'fluid-scale';

fluidScale();
```

## ⚡ Optimization

By default, FluidScale will scan CSS at runtime.
There are two approaches to optimize the final build.

### 📦 Approach 1: JSON Builder (recommended)

Set up `fluid-scale.config.js` in your project root.

Configure it, e.g.:

```js
export default {
  inputs: {
    'homepage:' ['src/homepage/**/*.html'],
    'about-us': ['src/about-us/**/*.html'],
  },
  output: 'public/fluid-scale',
};
```

You can also specify CSS files directly.

Make sure you initialize FluidScale with the right JSON ID:

```js
fluidScale({ json: 'homepage' });
```

Once done and you've tested everything in dev mode, build the JSON
`npx fluid-build`

FluidScale will now load asynchronously from JSON while the default values are applied instantly on load.

### 🕵️‍♂️ Approach 2: Usage Checks

You can have FluidScale check whether particular content uses FluidScale, and only scan that content.

```js
fluidScale({ checkUsage: true });
```

For linked stylesheets, apply data-fluid attribute:

```html
<link rel="stylesheet" href="styles.css" data-fluid />
```

For inline styles, add a comment at the very top:

```css
/*enable-fluid*/
```

Now FluidScale will skip the CSS that doesn't have these markers, speeding things up.

## 🧱 Isolation

By default, FluidScale watches the whole DOM to apply itself to any new content.
If the whole team uses FluidScale, this is a solid approach. However, if that's not the case, it may be better to only apply FluidScale to your own content.

```js
fluidScale({ autoObserve: false, json: 'homepage' });
```

then

```js
fluidScale.addElements(...parentAndChildren);
```
