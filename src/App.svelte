<script>
	import Loading from './Loading.svelte'
	import ErrorLoading from './ErrorLoading.svelte'
	import Product from './Product.svelte'


	let app_status = { loaded: true, loading: false, error: false };

	let products = [];

	let promise_products = getProducts();

	async function getProducts(){
		const res = await fetch('https://js-amazon-test.herokuapp.com/products/');
		const txt = await res.json();

		if (res.ok){
			products = txt.products;
			return txt.products.length;
		} else {
			throw new Error(txt);
		}
	}

	function promiseClick(){
		promise_products = getProducts();
	}


</script>

<main>
	<h1><pre>Products</pre></h1>
	
	<button on:click={promiseClick}>
		reload products
	</button>

	{#await promise_products}
		<Loading/>
	{:then value}
		<p>{value} {value === 1 ? 'product' : 'products'} loaded</p>
		<table>
			<tbody>
				{#each products as prod (prod.id)}
					<Product asin={prod.asin} name={prod.name} category={prod.category} rank={prod.rank} 
									 weight={prod.weight} dimensions={prod.dimensions} />

				{/each}
			</tbody>
		</table>
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