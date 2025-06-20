![Tool Logo](./assets/logo.jpg)

Welcome to FluidScale, a JS runtime style engine that applies pixel-perfect fluid scaling to your CSS.

Write:

```css
.recipe-card {
  padding: 2rem;
}

@media (min-width: 375px) {
  /* Set the baseline minimum to scale from */
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
**Note:** If you're building to and loading from JSON, you can skip this approach.

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
fluidScale({ autoObserve: false });
```

then

```js
fluidScale.addElements(...parentAndChildren);
```

## 📐 Advanced

If you want more precise control over the default style applied before FluidScale has loaded and applied:

```js
fluidScale({ autoApply: false, minimizedMode: false });
```

For properties with multiple values:

```css
.recipe-card {
  --fluid-padding-min: 2rem 1.5rem;
  --fluid-padding-max: 4rem 3rem;
  padding: var(
    --fluid-padding-value,
    clamp(2rem, 3vw + 1rem, 4rem) clamp(1.5rem, 2vw + 0.8rem, 3rem)
  );
}
```

For single-value properties:

```css
.recipe-card {
  --fluid-font-size: 2rem 4rem;
  font-size: var(--fluid-font-size-value, clamp(2rem, 2vw + 2rem, 4rem));
}
```
