<script>
	import Loading from './Loading.svelte'
	import ErrorLoading from './ErrorLoading.svelte'
	import Product from './Product.svelte'
	import SearchBar from './SearchBar.svelte'


	// let app_status = { loaded: true, loading: false, error: false };

	const products_api = 'https://js-amazon-test.herokuapp.com/products/';
	let products = [];

	let promise_products = getProducts();

	async function searchProduct(ASIN){
		const res = await fetch(products_api + ASIN);
		const txt = await res.json();

		if (res.ok){
			promiseClick();
			// return txt.products.length;
		} else {
			throw new Error(txt);
		}
	}


	async function getProducts(){
		const res = await fetch(products_api);
		const txt = await res.json();

		if (res.ok){
			products = txt.products;
			return txt.products.length;
		} else {
			throw new Error(txt);
		}
	}

	function promiseClick(){
		console.log('loading products...')
		promise_products = getProducts();
	}

	function searchClick(searchString){
		console.log('search: ' + searchString);
		searchProduct(searchString);
	}

	function handleMessage(event){
		// alert(event.detail.action);
		switch(event.detail.action) {
			case 'reload': promiseClick(); break;
			case 'search': 
				searchClick(event.detail.searchString);
				break;
		}
	}

</script>

<main>

	<h1><pre>Products</pre></h1>



	{#await promise_products}
		<Loading/>
	{:then value}

		<SearchBar on:message={handleMessage}/>

		
		<table>
			<tbody>
				{#each products as prod (prod.id)}
					<Product asin={prod.asin} name={prod.name} category={prod.category} rank={prod.rank} 
									 weight={prod.weight} dimensions={prod.dimensions} />

				{/each}
			</tbody>
		</table>
		<p>{value} {value === 1 ? 'product' : 'products'} loaded</p>
	{:catch error}
		<ErrorLoading/>
	{/await}


</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 3em;
		font-weight: 100;
	}

	table {
		width: 100%;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>