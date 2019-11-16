<script>
  export let asin = 2818281;
  export let name = 'ola k ase';
  export let category = 'product';
  export let rank = '2.5'
  export let weight = '43 lb';
  export let dimensions = '1 x 2 x 3 inch';
  let count = 0;


  function handleClick(){
    count += 1;
  }
</script>

<style>
  tr {
    text-align: left;
    /* color: purple; */
  }
  td {
    padding: 0.3em 0.5em;
  }
</style>

<tr on:click={handleClick}>
  <td>{asin}</td>
  <td>{category}</td>
  <td>{name.length > 50 ? name.slice(0,50)+'...' : name}</td>

  <!-- <td>{weight}</td>
  <td>{dimensions}</td> -->
  <td>{count}</td>
</tr>
