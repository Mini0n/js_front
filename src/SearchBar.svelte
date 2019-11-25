<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();


  let searchString = '';
  // export let products = [];

  function searchClick(){
    dispatch('message', { action: 'search', searchString: searchString });
  }

  function reloadProducts(){
    dispatch('message', {action: 'reload'});
  }


  
</script>

<style>
  input {
    font-family: monospace;
    width: 100%;
  }
  .search-div {
    width: 100%;
    display: inline-block;
    padding: 0.5em;
  }
  .search-input {
    /* width: 65%; */
    display: inline-block;
  }

  .buttons {
    /* width: 20%; */
    display: inline-block;
  }
</style>

<div class="search-div">
  <div class="search-input">
    <input type="text" placeholder="ASIN" bind:value={searchString}>
  </div>
  <div class="buttons">
  	<button on:click={searchClick}>
		Add Product by ASIN
	</button>
  <button on:click={reloadProducts}>
		Reload Products
	</button>
  </div>
</div>