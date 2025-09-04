import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),
  kit: {
		adapter: adapter({
	  platformProxy: {
		persist: './static'
	  }
		}),
    alias: {
      $data: "../data",
      $components: "src/lib/components",
      $configs: "src/lib/configs",
      $constants: "src/lib/constants",
      $stores: "src/lib/stores",
      $utils: "src/lib/utils",
      $validations: "src/lib/validations",
    }
  }
};

export default config;
