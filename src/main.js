import App from './App.svelte';
import Charts from './charts.svelte';

// const app = new App({
// 	target: document.body,
// 	props: {
// 		name: 'world'
// 	}
// });

const app = new Charts({
	target: document.body,
});

export default app;