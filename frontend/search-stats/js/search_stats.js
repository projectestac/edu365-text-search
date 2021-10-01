/* global $, document, moment, yadcf */

function formatOrder(dataTableColumns, dataTableOrder) {
  return dataTableOrder.map(function (orderObject) {
    return [
      dataTableColumns[orderObject.column].data,
      orderObject.dir.toUpperCase()
    ];
  });
}

function formatYadcfSearch(dataTableColumns) {
  let yadcfSearch = [];
  dataTableColumns.forEach(function (tableColumn) {
    if (tableColumn.search.value) {
      yadcfSearch.push([tableColumn.data, tableColumn.search.value]);
    }
  });
  return yadcfSearch;
}

function configureDateButtonsFilter(buttonsContainerId, dataTable, col) {

  let buttonsContainer = $(`#${buttonsContainerId} .dateButtons`);
  buttonsContainer.find('.todayButton').click(function () {
    console.log(this);
    console.log('hola');
    let today = moment().format("DD/MM/YYYY");
    yadcf.exFilterColumn(dataTable, [[col, { from: today, to: today }]], true);
  });

  buttonsContainer.find('.thisWeekButtom').click(function () {
    let from = moment().day(1).format("DD/MM/YYYY");
    let to = moment().format("DD/MM/YYYY");
    yadcf.exFilterColumn(dataTable, [[col, { from: from, to: to }]], true);
  });

  buttonsContainer.find('.thisMonthButtom').click(function () {
    let from = moment().format("01/MM/YYYY");
    let to = moment().format("DD/MM/YYYY");
    yadcf.exFilterColumn(dataTable, [[col, { from: from, to: to }]], true);
  });

  buttonsContainer.find('.thisYearButtom').click(function () {
    let from = moment().format("01/01/YYYY");
    let to = moment().format("DD/MM/YYYY");
    yadcf.exFilterColumn(dataTable, [[col, { from: from, to: to }]], true);
  });

  buttonsContainer.find('.allDatesButtom').click(function () {
    yadcf.exResetFilters(dataTable, [col]);
  });
}

function configureSearchesTableYadcf(dataTable) {
  yadcf.init(dataTable, [
    { column_number: 0, filter_type: "text", filter_delay: 500 },
    { column_number: 1, filter_type: "text", filter_delay: 500 },
    { column_number: 2, filter_type: "text", filter_delay: 500 },
    { column_number: 3, filter_type: "range_number", filter_delay: 500 },
    { column_number: 4, filter_type: "range_date", date_format: "dd/mm/yyyy", filter_delay: 500 },
  ]);
}

function configureSearchesTable() {
  let searchesTable = $('#searchesTable').DataTable({
    dom: 'lrtip',
    processing: true,
    serverSide: true,
    //stateSave: true,
    language: { "url": "//cdn.datatables.net/plug-ins/1.10.20/i18n/Spanish.json" },
    ajax: {
      //url: 'http://localhost:8765/search-stats',
      url: 'https://met.xtec.cat/edu365/search-stats',
      data: function (data) {
        console.log(data);

        const serverData = {
          auth: 'lhdi8hbGGrja74hwr',
          draw: data.draw,
          page_size: data.length,
          offset: data.start,
          order: formatOrder(data.columns, data.order),
          search: formatYadcfSearch(data.columns),
          tz: moment.tz.guess(),
        };
        console.log(serverData);

        return serverData;
      }
    },
    columns: [
      { data: "id", visible: false },
      {
        data: "text",
        render: function (data, _type, _row) {
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
        render: function (data, _type, _row) {
          return moment(data).format("DD-MM-YYYY HH:mm:ss");
        }
      },
    ],
    order: [[4, "desc"]]
  });

  configureSearchesTableYadcf(searchesTable);
  configureDateButtonsFilter('searchesCard', searchesTable, 4);
}

function configureMostWantedTableYadcf(dataTable) {
  yadcf.init(dataTable, [
    { column_number: 0, filter_type: "text", filter_delay: 500 },
    { column_number: 1, filter_type: "range_number", filter_delay: 500 },
    { column_number: 2, filter_type: "range_date", date_format: "dd/mm/yyyy", filter_delay: 500, filter_container_id: 'mostWantedDateFilterContainer' },
  ]);
}

function configureMostWantedTable() {
  let mostWantedTable = $('#mostWantedTable').DataTable({
    dom: 'lrtip',
    processing: true,
    serverSide: true,
    //stateSave: true,
    language: { "url": "//cdn.datatables.net/plug-ins/1.10.20/i18n/Spanish.json" },
    ajax: {
      //url: 'http://localhost:8765/stats/most-wanted',
      url: 'https://met.xtec.cat/edu365/stats/most-wanted',
      data: function (data) {
        console.log(data);

        const serverData = {
          auth: 'lhdi8hbGGrja74hwr',
          draw: data.draw,
          page_size: data.length,
          offset: data.start,
          order: formatOrder(data.columns, data.order),
          search: formatYadcfSearch(data.columns),
          tz: moment.tz.guess(),
        };
        console.log(serverData);

        return serverData;
      }
    },
    columns: [
      {
        data: "text",
        render: function (data, _type, _row) {
          let text = data;
          let maxLenght = 50;
          if (text.length > maxLenght)
            text = text.slice(0, maxLenght) + '...';

          return `<span title="${data}">${text}</span>`;
        }
      },
      { data: "num_searches" },
      {
        data: "createdAt",
        render: function (data, _type, _row) {
          return moment(data).format("DD-MM-YYYY HH:mm:ss");
        },
        visible: false,
      },
    ],
    order: [[1, "desc"]]
  });

  configureMostWantedTableYadcf(mostWantedTable);
  configureDateButtonsFilter('mostWantedCard', mostWantedTable, 2);

  return mostWantedTable;
}

$(document).ready(function () {
  $('.input-daterange input').each(function () {
    $(this).datepicker({
      changeMonth: true,
      changeYear: true,
      dateFormat: 'dd/mm/yy',
    });
  });


  configureSearchesTable();
  configureMostWantedTable();



});