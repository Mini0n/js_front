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
    font-family: monospace;
    /* color: purple; */
  }
  td {
    padding: 0.3em 0.5em;
  }

  .asin, .rank {
    font-weight: bold;
  }
</style>

<tr on:click={handleClick}>
  <td class='asin'>{asin}</td>
  <td>{category}</td>
  <td>{name.length > 20 ? name.slice(0,20)+'...' : name}</td>
  <td>{weight}</td>
  <td>{dimensions}</td>
  <td class='rank'>{rank}</td>
</tr>
