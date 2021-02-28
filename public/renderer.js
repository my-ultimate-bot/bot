const socket = io();

Number.prototype.toFixedNumber = function (x, base) {
  const pow = (base || 10) ** x;
  return Number(Math.floor(this * pow) / pow);
};

Number.prototype.noExponents = function () {
  const data = String(this).split(/[Ee]/);

  if (data.length === 1) { return data[0]; }
  let z = ''; const sign = this < 0 ? '-' : '';
  const str = data[0].replace('.', '');
  let mag = Number(data[1]) + 1;

  if (mag < 0) {
    z = `${sign}0.`;
    while (mag++) { z += '0'; }
    return z + str.replace(/^-/, '');
  }
  mag -= str.length;
  while (mag--) { z += '0'; }
  return str + z;
};

let selectedCoin = 'ETH/BTC'; // TODO: Init pair
// let selectedCoinMAIN = 'ETH/BTC';
let toggleClickIndex = 0;
let lastStates = [];

$.fn.toggleClick = function (...args) {
  const methods = args; // Store the passed arguments for future reference
  const count = methods.length; // Cache the number of methods

  // Use return this to maintain jQuery chainability
  // For each element you bind to
  return this.each((i, item) => {
    // Bind a click handler to that element
    $(item).on('click', function () {
      // That when called will apply the 'index'th method to that element
      // the index % count means that we constrain our iterator between 0
      // and (count-1)
      return Reflect.apply(methods[toggleClickIndex++ % count], this, args);
    });
  });
};

$(document).ready(() => {
  // Home page
  // Init

  socket.emit('version');
  socket.once('version', (version) => {
    const cookieVersion = Cookies.get('version');

    if (cookieVersion !== version) {
      Cookies.remove('license');
      Cookies.remove('version');

      location.reload();
    }

    document.title = `${document.title} v${version}`;
  });

  // Tooltips
  $('[data-toggle="tooltip"]').tooltip();

  // Reload previous states
  const lastStatesRef = {
    // Global
    reinvestment: $('#main-reinvestment'),
    timeOrder: $('#main-time-order'),
    timeFrame: $('#main-time-frame'),
    tradingStrictness: $('#main-trading-strictness'),
    skipPair: $('#main-skip-pair'),
    minimumVolume: $('#main-minimum-volume'),
    mode: $('#main-mode'),
    scanInterval: $('#main-scan-interval'),

    useMarketNeutralStrategy: $('#main-use-market-neutral-strategy'),
    marketNeutralMaxOpenPosition: $('#main-market-neutral-max-open-position'),
    marketNeutralAmountDollar: $('#main-market-neutral-amount-dollar'),
    marketNeutralFundingFee: $('#main-market-neutral-funding-fee'),

    useDcaStrategy: $('#main-use-dca-strategy'),
    dcaAmountDollar: $('#main-dca-amount-dollar'),
    dcaPeriod: $('#main-dca-period'),
    dcaTradingPair: $('#main-dca-trading-pair'),

    // Dip
    useDipStrategy: $('#main-use-dip-strategy'),
    dipMarketPlace: $('#main-dip-market-place'),
    dipUseMarket: $('#main-dip-use-market'),
    dipAmountPercentage: $('#main-dip-amount-percentage'),
    dipTakeProfitPercentage: $('#main-dip-take-profit-percentage'),
    dipStopLossPercentage: $('#main-dip-stop-loss-percentage'),
    dipStableMarket: $('#main-dip-stable-market'),
    dipUseStableMarket: $('#main-dip-use-stable-market'),
    dipMaxOpenOrder: $('#main-dip-max-open-order'),

    // Spike
    useSpikeStrategy: $('#main-use-spike-strategy'),
    spikeAmountPercentage: $('#main-spike-amount-percentage'),
    spikeTakeProfitPercentage: $('#main-spike-take-profit-percentage'),
    spikeDCAPercentage: $('#main-spike-dca-percentage'),
    spikeStopLossPercentage: $('#main-spike-stop-loss-percentage'),
    spikeMaxOpenPosition: $('#main-spike-max-open-position'),
  };

  socket.on('isRunning', (isRunning) => {
    if (isRunning) {
      toggleClickIndex = 1;
      $('#main-start').html('<i class="tim-icons icon-button-pause"></i>Stop');

      Object.values(lastStatesRef).forEach((dom) => {
        dom.prop('disabled', true);
      });
    } else {
      toggleClickIndex = 0;
      $('#main-start').html('<i class="tim-icons icon-triangle-right-17"></i>Start');

      Object.values(lastStatesRef).forEach((dom) => {
        dom.prop('disabled', false);
      });
    }
  });

  socket.on('lastStates', (states) => {
    lastStates = states;
    Object.keys(lastStatesRef).forEach((key) => {
      if (key === 'reinvestment' || key === 'useMarketNeutralStrategy' || key === 'useDcaStrategy' || key === 'useDipStrategy' || key === 'dipUseMarket' || key === 'dipUseStableMarket' || key === 'useSpikeStrategy') {
        lastStatesRef[key].prop('checked', lastStates[key] || false);
      } else if (key === 'skipPair' || key === 'dcaTradingPair') {
        lastStatesRef[key].select2();
        lastStatesRef[key].val(lastStates[key]);
        lastStatesRef[key].trigger('change');
      } else {
        lastStatesRef[key].val(lastStates[key]);
      }
    });
  });
  // Reload previous states

  // Fetch Market
  // let intervalMAIN;
  socket.emit('fetchMarket');
  socket.on('fetchMarket', (pair) => {
    $('#pair').html(pair);
    $('#main-skip-pair').html(pair);
    $('#main-skip-pair').select2();
    $('#main-dca-trading-pair').html(pair);
    $('#main-dca-trading-pair').select2();

    // Restore last states
    Object.keys(lastStatesRef).forEach((key) => {
      if (key === 'skipPair' || key === 'dcaTradingPair') {
        lastStatesRef[key].select2();
        lastStatesRef[key].val(lastStates[key]);
        lastStatesRef[key].trigger('change');
      }
    });

    // $('#main-pair').html(pair);
    selectedCoin = $('#pair').val();
    // selectedCoinMAIN = $('#main-pair').val();
    // socket.emit('fetchInfoMain', selectedCoinMAIN);
    socket.emit('fetchInfoPair', selectedCoin);
    // intervalMAIN = setInterval(() => {
    //   socket.emit('fetchInfoMain', selectedCoinMAIN);
    // }, 5000);
  });

  // Fetch main coin
  // let parse2InputOnce = true;
  // socket.on('fetchInfoMain', ({ bid, ask, percentage }) => {
  //   $('#main-signal-bid').text(bid);
  //   $('#main-signal-ask').text(ask);
  //   $('#main-signal-change').text(percentage);

  //   if (parse2InputOnce) {
  //     parse2InputOnce = false;
  //     // Change default dipAmountPercentage and dispatch an event
  //     $('#main-dip-amount-percentage').val(15);
  //     $('#main-dip-amount-percentage').trigger('change');
  //   }
  // });

  let focusMain = true;

  // End Init

  // MAIN Page
  // Calc amount to buy

  // $('#main').click(() => {
  //   setTimeout(() => {
  //     $('#main-pair').select2();
  //   }, 500);
  // });

  // $('#main-pair').on('change', function () {
  //   selectedCoinMAIN = $(this).val();
  //   $('#main-amount').val('');
  //   socket.emit('fetchInfoMain', selectedCoinMAIN);
  //   clearInterval(intervalMAIN);
  //   intervalMAIN = setInterval(() => {
  //     socket.emit('fetchInfoMain', selectedCoinMAIN);
  //   }, 5000);
  // });

  // $('#main-dip-amount-percentage').on('change', function () {
  //   const percentage = $(this).val() / 100;
  //   const re = /\w+$/;
  //   const [market] = selectedCoinMAIN.match(re);
  //   const pair = selectedCoinMAIN;
  //   socket.emit('amount', { market, pair, percentage });
  //   socket.on('amount', (data) => {
  //     $('#main-amount').val(data);
  //     socket.removeAllListeners('amount');
  //   });
  // });

  // Main start
  $('#main-start').toggleClick(() => {
    // TODO: config this every time
    // const pair = selectedCoinMAIN;

    // Global
    const reinvestment = $('#main-reinvestment').is(':checked');
    const timeOrder = $('#main-time-order').val() !== '' ? Number.parseFloat($('#main-time-order').val()) : 45;
    const timeFrame = $('#main-time-frame').val();
    const tradingStrictness = $('#main-trading-strictness').val();
    const skipPair = $('#main-skip-pair').val();
    const minimumVolume = $('#main-minimum-volume').val() !== '' ? Number.parseFloat($('#main-minimum-volume').val()) : 50000;
    const mode = $('#main-mode').val();
    const scanInterval = $('#main-scan-interval').val() !== '' ? Number.parseFloat($('#main-scan-interval').val()) : 30;

    // Market-Neutral
    const useMarketNeutralStrategy = $('#main-use-market-neutral-strategy').is(':checked');
    const marketNeutralMaxOpenPosition = $('#main-market-neutral-max-open-position').val() !== '' ? Number.parseFloat($('#main-market-neutral-max-open-position').val()) : 1;
    const marketNeutralAmountDollar = $('#main-market-neutral-amount-dollar').val() !== '' ? Number.parseFloat($('#main-market-neutral-amount-dollar').val()) : 20;
    const marketNeutralFundingFee = $('#main-market-neutral-funding-fee').val() !== '' ? Number.parseFloat($('#main-market-neutral-funding-fee').val()) : 0.1;

    // DCA
    const useDcaStrategy = $('#main-use-dca-strategy').is(':checked');
    const dcaAmountDollar = $('#main-dca-amount-dollar').val() !== '' ? Number.parseFloat($('#main-dca-amount-dollar').val()) : 25;
    const dcaPeriod = $('#main-dca-period').val();
    const dcaTradingPair = $('#main-dca-trading-pair').val();

    // Dip
    const useDipStrategy = $('#main-use-dip-strategy').is(':checked');
    const dipMarketPlace = $('#main-dip-market-place').val();
    const dipUseMarket = $('#main-dip-use-market').is(':checked');
    const dipAmountPercentage = $('#main-dip-amount-percentage').val() !== '' ? Number.parseFloat($('#main-dip-amount-percentage').val()) : 15;
    const dipTakeProfitPercentage = $('#main-dip-take-profit-percentage').val() !== '' ? Number.parseFloat($('#main-dip-take-profit-percentage').val()) : 1.5;
    const dipStopLossPercentage = $('#main-dip-stop-loss-percentage').val() !== '' ? Number.parseFloat($('#main-dip-stop-loss-percentage').val()) : 3;
    const dipStableMarket = $('#main-dip-stable-market').val();
    const dipUseStableMarket = $('#main-dip-use-stable-market').is(':checked');
    const dipMaxOpenOrder = $('#main-dip-max-open-order').val() !== '' ? Number.parseFloat($('#main-dip-max-open-order').val()) : 2;

    // Spike
    const useSpikeStrategy = $('#main-use-spike-strategy').is(':checked');
    const spikeAmountPercentage = $('#main-spike-amount-percentage').val() !== '' ? Number.parseFloat($('#main-spike-amount-percentage').val()) : 5;
    const spikeTakeProfitPercentage = $('#main-spike-take-profit-percentage').val() !== '' ? Number.parseFloat($('#main-spike-take-profit-percentage').val()) : 2.5;
    const spikeDCAPercentage = $('#main-spike-dca-percentage').val() !== '' ? Number.parseFloat($('#main-spike-dca-percentage').val()) : 5;
    const spikeStopLossPercentage = $('#main-spike-stop-loss-percentage').val() !== '' ? Number.parseFloat($('#main-spike-stop-loss-percentage').val()) : 7;
    const spikeMaxOpenPosition = $('#main-spike-max-open-position').val() !== '' ? Number.parseFloat($('#main-spike-max-open-position').val()) : 1;

    socket.emit('main-start', {
      timeOrder,
      timeFrame,
      tradingStrictness,
      skipPair,
      minimumVolume,
      reinvestment,
      mode,
      scanInterval,
      useMarketNeutralStrategy,
      marketNeutralMaxOpenPosition,
      marketNeutralAmountDollar,
      marketNeutralFundingFee,
      useDcaStrategy,
      dcaAmountDollar,
      dcaPeriod,
      dcaTradingPair,
      useDipStrategy,
      dipMarketPlace,
      dipUseMarket,
      dipAmountPercentage,
      dipTakeProfitPercentage,
      dipStopLossPercentage,
      dipStableMarket,
      dipUseStableMarket,
      dipMaxOpenOrder,
      useSpikeStrategy,
      spikeAmountPercentage,
      spikeTakeProfitPercentage,
      spikeDCAPercentage,
      spikeStopLossPercentage,
      spikeMaxOpenPosition,
    });

    $('#main-start').html('<i class="tim-icons icon-button-pause"></i>Stop');

    Object.values(lastStatesRef).forEach((dom) => {
      dom.prop('disabled', true);
    });
  }, () => {
    socket.emit('main-stop');
    $('#main-start').html('<i class="tim-icons icon-triangle-right-17"></i>Start').prop('disabled', true);

    Object.values(lastStatesRef).forEach((dom) => {
      dom.prop('disabled', false);
    });
  });

  // Live trigger info

  function removeTriggerListOverLoad() {
    let alertLength = $('.alert').length;

    if (alertLength > 500) {
      while (alertLength > 500) {
        $('.alert').last().remove();
        alertLength = $('.alert').length;
      }
    }
  }

  // Buy
  socket.on('triggerBuy', (msg) => {
    $('#trigger')
      .prepend(`<div class="alert alert-info">
        <span>${msg}</span>
      </div>`);
    removeTriggerListOverLoad();
  });

  // Sell
  socket.on('triggerSell', (msg) => {
    $('#trigger')
      .prepend(`<div class="alert alert-success">
        <span>${msg}</span>
    </div>`);
    removeTriggerListOverLoad();
  });

  // Stoploss
  socket.on('triggerStopLoss', (msg) => {
    $('#trigger')
      .prepend(`<div class="alert alert-danger">
        <span>${msg}</span>
    </div>`);
    removeTriggerListOverLoad();
  });

  // General
  socket.on('general', (msg) => {
    $('#trigger')
      .prepend(`<div class="alert alert-primary">
        <span>${msg}</span>
    </div>`);
    removeTriggerListOverLoad();
  });

  // Enable the button when it fully stopped
  socket.on('stopBot', (msg) => {
    $('#trigger')
      .prepend(`<div class="alert alert-danger">
          <span>${msg}</span>
        </div>`);
    $('#main-start').attr('disabled', false);
  });

  // Error
  socket.on('error', (msg) => {
    // $('#trigger')
    //   .prepend(`<div class="alert alert-danger">
    //     <span>For debugging only: ${msg}</span>
    // </div>`);
    // removeTriggerListOverLoad();
    console.log(msg);
  });

  // Order page
  // Loading active and history orders
  $('#orders').click(() => {
    $('#list-orders').html('');
    socket.emit('fetchOrder');
    socket.emit('fetchAsset');
  });

  // Main Assets
  socket.on('fetchAsset', (assets) => {
    $('#list-assets').html('');
    const assetTable = assets.reduce((totalAssetTable, {
      coin = '-', balance = 0, inUSD = 0,
    }) => `${totalAssetTable}<tr>
      <td class="text-center">
        ${coin}
      </td>
      <td class="text-center">
        ${balance}
      </td>
      <td class="text-center">
        ${inUSD.toFixedNumber(2).noExponents()} USD
      </td>
    </tr>`, '');
    $('#list-assets').html(assetTable);
  });

  // Active / Pending orders
  socket.on('listOrder', (data) => {
    const orderTable = data.reduce((totalOrderTable, {
      datetime = moment().valueOf(), id = '-', symbol = '-', amount = 0, price = 0, side = '-', remaining = 0, type = 'open',
    }) => {
      const buyBtn = `<button type="button" rel="Market Buy" class="btn btn-danger btn-link btn-sm market-action" data-id="${id}" data-symbol="${symbol}" data-action="market-buy" data-remaining="${remaining}" data-type="${type}">
      Market Buy
    </button>`;
      const sellBtn = `<button type="button" rel="Market Sell" class="btn btn-danger btn-link btn-sm market-action" data-id="${id}" data-symbol="${symbol}" data-action="market-sell" data-remaining="${remaining}" data-type="${type}">
      Market Sell
    </button>`;

      const renderMarketAction = () => {
        if (side === 'buy') {
          if (type === 'pending') {
            return sellBtn;
          }

          return buyBtn;
        }

        return sellBtn;
      };

      return `${totalOrderTable}<tr>
      <td class="text-center">
        ${moment(datetime).format('YYYY-MM-DD HH:mm')}
      </td>
      <td class="text-center">
        ${symbol}
      </td>
      <td class="text-center">
        ${amount}
      </td>
      <td class="text-center">
        ${price}
      </td>
      <td class="text-center">
      ${side.toUpperCase()}
      </td>
      <td class="text-center">
        ${renderMarketAction()}
        <button type="button" rel="Cancel" class="btn btn-danger btn-link btn-sm market-action" data-id="${id}" data-symbol="${symbol}" data-action="cancel" data-remaining="0" data-type="open">
          Cancel
        </button>
      </td>
    </tr>`;
    }, '');
    $('#list-orders').html(orderTable);
  });

  $('body').on('click', '.market-action', function () {
    const symbol = $(this).data('symbol');
    const orderId = $(this).data('id');
    const action = $(this).data('action');
    const remaining = $(this).data('remaining');
    const type = $(this).data('type');

    socket.emit('marketAction', {
      symbol, orderId, action, remaining, type,
    });

    $(this).closest('tr').remove();
  });

  // $('.market-action').click(function () {

  // });

  // History orders
  socket.on('listHistoryOrder', (data) => {
    $('#list-history-orders').html('');
    const orderHistoryTable = data.reduce((totalOrderHistoryTable, {
      datetime = moment().valueOf(), symbol = '-', amount = '-', price = '-', side = '-', profitLoss = '-', inUSD = '-',
    }) => `${totalOrderHistoryTable}<tr>
      <td class="text-center">
        ${moment(datetime).format('YYYY-MM-DD HH:mm')}
      </td>
      <td class="text-center">
        ${symbol}
      </td>
      <td class="text-center">
        ${amount}
      </td>
      <td class="text-center">
        ${price}
      </td>
      <td class="text-center">
        ${side.toUpperCase()}
      </td>
      <td class="text-center">
        ${typeof profitLoss === 'number' ? profitLoss.toFixedNumber(2).noExponents() : profitLoss} % (${typeof inUSD === 'number' ? inUSD.toFixedNumber(2).noExponents() : inUSD} USD)
      </td>
    </tr>`, '');
    $('#list-history-orders').html(orderHistoryTable);
  });

  // Manual page
  $('#manual').click(() => {
    setTimeout(() => {
      $('#pair').select2();
    }, 500);
  });

  $('#pair').on('change', function () {
    selectedCoin = $(this).val();
    // eslint-disable-next-line no-new
    new TradingView.widget(
      {
        width: 980,
        height: 610,
        symbol: `${$('#exchangeID').val().toUpperCase()}:${selectedCoin.replace('/', '')}`,
        interval: '30',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
        calendar: true,
        container_id: 'trading-view-chart',
      },
    );
    $('#rate-buy').val('');
    $('#rate-sell').val('');
    $('#amount-buy').val('');
    $('#amount-sell').val('');
  });

  // Get rate
  socket.on('fetchInfoPair', ({ bid, ask, last }) => {
    const rateBuyType = $('#rate-buy-type').val();
    const rateSellType = $('#rate-sell-type').val();
    $('#rate-buy').val(eval(rateBuyType));
    $('#rate-sell').val(eval(rateSellType));
  });

  $('.rate-type').on('change', () => socket.emit('fetchInfoPair', selectedCoin));
  // Get rate

  $('#amount-buy-percentage').on('change', () => {
    const re = /\w+$/;
    const [market] = selectedCoin.match(re);
    socket.emit('balance', market);
    socket.on('balance', (balance) => {
      const percentage = $('#amount-buy-percentage').val() / 100;
      const rateBuy = $('#rate-buy').val();
      const amount = (balance / rateBuy) * percentage;
      $('#amount-buy').val(amount);
      socket.removeAllListeners('balance');
    });
  });

  $('#amount-sell-percentage').on('change', () => {
    const re = /^\w+/;
    const [market] = selectedCoin.match(re);
    socket.emit('balance', market);
    socket.on('balance', (balance) => {
      const percentage = $('#amount-sell-percentage').val() / 100;
      const amount = balance * percentage;
      $('#amount-sell').val(amount);
      socket.removeAllListeners('balance');
    });
  });

  $('#buy-form').on('submit', function (event) {
    event.preventDefault();

    if ($('#rate-buy').val() !== '') {
      socket.emit('minAmount', [selectedCoin, ...$(this).serializeArray()]);
      socket.once('minAmount', (minAmount) => {
        const currentAmount = Number.parseFloat($('#amount-buy').val() === '' ? 0 : $('#amount-buy').val());

        if (currentAmount <= minAmount) {
          $('#amount-buy').val(minAmount);
        }
        socket.emit('manualBuy', [selectedCoin, ...$(this).serializeArray()]);
        $('#manual-buy-btn').text('Loading...').attr('disabled', 'disabled');
        $('#buy-text').hide();
        socket.once('manualBuy', (msg) => {
          $('#manual-buy-btn').text('Buy').attr('disabled', false);

          if (msg === 'successful') {
            $('#buy-text').show().text('Buy order placed!');
          } else {
            $('#buy-text').show().text('Can\'t buy the order');
          }
        });
      });
    }
  });

  $('#sell-form').on('submit', function (event) {
    event.preventDefault();

    if ($('#rate-sell').val() !== '') {
      socket.emit('minAmount', [selectedCoin, ...$(this).serializeArray()]);
      socket.once('minAmount', (minAmount) => {
        const currentAmount = Number.parseFloat($('#amount-sell').val() === '' ? 0 : $('#amount-sell').val());

        if (currentAmount <= minAmount) {
          $('#amount-sell').val(minAmount);
        }
        socket.emit('manualSell', [selectedCoin, ...$(this).serializeArray()]);
        $('#manual-sell-btn').text('Loading...').attr('disabled', 'disabled');
        $('#sell-text').hide();
        socket.once('manualSell', (msg) => {
          $('#manual-sell-btn').text('Sell').attr('disabled', false);

          if (msg === 'successful') {
            $('#sell-text').show().text('Sell order placed!');
          } else {
            $('#sell-text').show().text('Can\'t sell the order');
          }
        });
      });
    }
  });

  // Setting page

  // Fetch account list

  socket.emit('settingGet');
  socket.on('settingGet', ({ current, list }) => {
    // Render account list
    let accountList = '';
    list.forEach((account) => {
      accountList += `<option value="${account.name}">${account.name}</option>`;
    });
    $('#account-list').html(accountList);
    $('#account-list').val(current.name);

    // Filling current account form
    Object.keys(current).forEach((prop) => {
      $(`#${prop}`).val(current[prop]);
    });

    if (typeof current.apiKey === 'undefined' || current.apiKey === '') {
      $('#setting-link').click();
      $('#main').prop('disabled', true);
      $('#orders').prop('disabled', true);
      $('#manual').prop('disabled', true);
    } else if (focusMain) { // Click main section on first init
      $('#main').click();

      // Init skip pair
      setTimeout(() => {
        $('#main-skip-pair').select2();
        $('#main-dca-trading-pair').select2();
      }, 500);

      focusMain = false;
    }
  });

  // Change current account on selecting
  $('#account-list').on('change', function () {
    const selectedAccount = $(this).val();
    socket.emit('settingCurrentAccount', selectedAccount);
  });

  socket.on('settingCurrentAccount', (current) => {
    Object.keys(current).forEach((prop) => {
      $(`#${prop}`).val(current[prop]);
    });
  });

  // Save current account setting
  $('#save-account').click((e) => {
    e.preventDefault();
    const oldAccountName = $('#account-list').val();
    socket.emit('setting:save', $('#current-account').serializeArray(), oldAccountName);

    $('#main').prop('disabled', false);
    $('#orders').prop('disabled', false);
    $('#manual').prop('disabled', false);
  });

  // Delete current account
  $('#delete-account').click((e) => {
    e.preventDefault();
    const currentAccount = $('#name').val();
    socket.emit('setting:delete', currentAccount);
  });

  // Add new account
  $('#add-new').click((e) => {
    e.preventDefault();
    socket.emit('setting:post', $('#add-new-form').serializeArray());
  });

  // Reload states
  socket.emit('reloadState');
});

