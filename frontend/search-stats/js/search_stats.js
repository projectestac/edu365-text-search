function formatOrder(dataTableColumns, dataTableOrder) {
  return dataTableOrder.map(function (orderObject) {
    return [
      dataTableColumns[orderObject.column].data,
      orderObject.dir.toUpperCase()
    ]
  });
}

function formatYadcfSearch(dataTableColumns) {
  let yadcfSearch = [];
  dataTableColumns.forEach(function(tableColumn) {
    if (tableColumn.search.value) {
      yadcfSearch.push([tableColumn.data, tableColumn.search.value]);
    }
  })
  return yadcfSearch;
}

function configureYadcf(dataTable) {
  yadcf.init(dataTable, [
    { column_number: 0, filter_type: "text", filter_delay: 500 },
    { column_number: 1, filter_type: "text", filter_delay: 500 },
    { column_number: 2, filter_type: "text", filter_delay: 500 },
    { column_number: 3, filter_type: "range_number", filter_delay: 500 },
    { column_number: 4, filter_type: "range_date", date_format: "dd/mm/yyyy", filter_delay: 500 },
  ]);  
} 

$(document).ready(function () {
  let table = $('#searchesTable').DataTable( {
    dom: 'lrtip',
    processing: true,
    serverSide: true,
    //stateSave: true,
    language: { "url": "//cdn.datatables.net/plug-ins/1.10.20/i18n/Spanish.json" },
    ajax: {
      url: 'http://localhost:8765/search-stats',
      //url: 'https://met.xtec.cat/edu365/search-stats',
      data: function(data) {
        console.log(data);

        const serverData = {
          auth: 'lhdi8hbGGrja74hwr',
          draw: data.draw,
          page_size: data.length,
          offset: data.start,
          order: formatOrder(data.columns, data.order),
          search: formatYadcfSearch(data.columns)
        };
        console.log(serverData);

        return serverData;
      }
    },
    columns: [
      { data: "id", visible: false },
      { 
        data: "text",
        render: function ( data, type, row ) {
          let text = data;
          let maxLenght = 50;
          if (text.length > maxLenght)
            text = text.slice(0, maxLenght) + '...';

          return `<span title="${data}">${text}</span>`;
        }
      },
      { data: "ip", orderable: false },
      { data: "num_results" },
      { 
        data: "createdAt",
        render: function ( data, type, row ) {
          return moment(data).format("DD-MM-YYYY HH:mm:ss");
        }
      },
    ],
    order: [[ 4, "desc" ]]
  } );

  configureYadcf(table);
});