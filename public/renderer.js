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

let selectedCoin = 'BTC/USDT'; // TODO: Init symbol
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
    breakEven: $('#main-break-event'),
    timeOrder: $('#main-time-order'),
    timeFrame: $('#main-time-frame'),
    tradingStrictness: $('#main-trading-strictness'),
    skipSymbol: $('#main-skip-symbol'),
    skipSymbolReverse: $('#main-skip-symbol-reverse'),
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
    dcaTradingSymbol: $('#main-dca-trading-symbol'),

    // Dip
    useDipStrategy: $('#main-use-dip-strategy'),
    useDipCheckVolatileMarket: $('#main-use-dip-check-volatile-market'),
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
    useSpikeCheckVolatileMarket: $('#main-use-spike-check-volatile-market'),
    spikeAmountPercentage: $('#main-spike-amount-percentage'),
    spikeTakeProfitPercentage: $('#main-spike-take-profit-percentage'),
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
    const keyType = new Set(['reinvestment', 'breakEven', 'skipSymbolReverse', 'useMarketNeutralStrategy', 'useDcaStrategy', 'useDipStrategy', 'dipUseMarket', 'useDipCheckVolatileMarket', 'dipUseStableMarket', 'useSpikeStrategy', 'useSpikeCheckVolatileMarket']);

    Object.keys(lastStatesRef).forEach((key) => {
      if (keyType.has(key)) {
        lastStatesRef[key].prop('checked', lastStates[key] || false);
      } else {
        lastStatesRef[key].val(lastStates[key]);
      }
    });
  });
  // Reload previous states

  // Fetch Market
  // let intervalMAIN;
  socket.emit('fetchMarket');
  socket.on('fetchMarket', (symbol) => {
    $('#manual-symbol').html(symbol).select2({ width: '100%' }).val(selectedCoin)
      .trigger('change');
    $('#main-skip-symbol').html(symbol).select2({ width: '100%' });
    $('#main-dca-trading-symbol').html(symbol).select2({ width: '100%' });

    // Default skip symbols list
    $('#main-skip-symbol').select2({ width: '100%' }).val([
      'BTC/USDT',
      'ETH/USDT',
      'BNB/USDT',
      'ADA/USDT',
      'XRP/USDT',
      'SOL/USDT',
      'DOT/USDT',
      'UNI/USDT',
      'LUNA/USDT',
      'LTC/USDT',
      'AVAX/USDT',
    ]).trigger('change');

    // Restore last states
    Object.keys(lastStatesRef).forEach((key) => {
      if ((key === 'skipSymbol' || key === 'dcaTradingSymbol') && lastStates[key]) {
        lastStatesRef[key].select2({ width: '100%' }).val(lastStates[key]).trigger('change');
      }
    });

    selectedCoin = $('#manual-symbol').val();
  });
  let focusMain = true;

  // End Init

  // MAIN Page
  // Main start
  $('#main-start').toggleClick(() => {
    // TODO: config this every time
    // const symbol = selectedCoinMAIN;

    // Global
    const reinvestment = $('#main-reinvestment').is(':checked');
    const breakEven = $('#main-break-event').is(':checked');
    const timeOrder = $('#main-time-order').val() !== '' ? Number.parseFloat($('#main-time-order').val()) : 45;
    const timeFrame = $('#main-time-frame').val();
    const tradingStrictness = $('#main-trading-strictness').val();
    const skipSymbol = $('#main-skip-symbol').val();
    const skipSymbolReverse = $('#main-skip-symbol-reverse').is(':checked');
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
    const dcaTradingSymbol = $('#main-dca-trading-symbol').val();

    // Dip
    const useDipStrategy = $('#main-use-dip-strategy').is(':checked');
    const useDipCheckVolatileMarket = $('#main-use-dip-check-volatile-market').is(':checked');
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
    const useSpikeCheckVolatileMarket = $('#main-use-spike-check-volatile-market').is(':checked');
    const spikeAmountPercentage = $('#main-spike-amount-percentage').val() !== '' ? Number.parseFloat($('#main-spike-amount-percentage').val()) : 5;
    const spikeTakeProfitPercentage = $('#main-spike-take-profit-percentage').val() !== '' ? Number.parseFloat($('#main-spike-take-profit-percentage').val()) : 2.5;
    const spikeStopLossPercentage = $('#main-spike-stop-loss-percentage').val() !== '' ? Number.parseFloat($('#main-spike-stop-loss-percentage').val()) : 7;
    const spikeMaxOpenPosition = $('#main-spike-max-open-position').val() !== '' ? Number.parseFloat($('#main-spike-max-open-position').val()) : 1;

    socket.emit('main-start', {
      timeOrder,
      timeFrame,
      tradingStrictness,
      skipSymbol,
      skipSymbolReverse,
      minimumVolume,
      reinvestment,
      breakEven,
      mode,
      scanInterval,
      useMarketNeutralStrategy,
      marketNeutralMaxOpenPosition,
      marketNeutralAmountDollar,
      marketNeutralFundingFee,
      useDcaStrategy,
      dcaAmountDollar,
      dcaPeriod,
      dcaTradingSymbol,
      useDipStrategy,
      useDipCheckVolatileMarket,
      dipMarketPlace,
      dipUseMarket,
      dipAmountPercentage,
      dipTakeProfitPercentage,
      dipStopLossPercentage,
      dipStableMarket,
      dipUseStableMarket,
      dipMaxOpenOrder,
      useSpikeStrategy,
      useSpikeCheckVolatileMarket,
      spikeAmountPercentage,
      spikeTakeProfitPercentage,
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
  socket.on('fetchOrder', (data) => {
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

  $('#manual-symbol').on('change', () => {
    selectedCoin = $('#manual-symbol').val();
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
  });

  $('#manual-execute').click(() => {
    // Global
    const symbol = $('#manual-symbol').val();
    const entryPrice = $('#manual-entry-price').val() !== '' ? Number.parseFloat($('#manual-entry-price').val()) : 0;
    const entryPriceType = $('#manual-entry-price-type').val();
    const amount = $('#manual-amount').val() !== '' ? Number.parseFloat($('#manual-amount').val()) : 5;
    const amountType = $('#manual-amount-type').val();
    const takeProfitPercentage = $('#manual-take-profit-percentage').val() !== '' ? Number.parseFloat($('#manual-take-profit-percentage').val()) : 10;
    const stopLossPercentage = $('#manual-stop-loss-percentage').val() !== '' ? Number.parseFloat($('#manual-stop-loss-percentage').val()) : 5;

    $('#manual-execute').text('Loading...').attr('disabled', 'disabled');

    socket.emit('manualExecute', {
      symbol,
      entryPrice,
      entryPriceType,
      amount,
      amountType,
      takeProfitPercentage,
      stopLossPercentage,
    });

    socket.once('manualExecute', (msg) => {
      $('#manual-execute').text('Execute').attr('disabled', false);

      if (msg === 'successful') {
        $('#manual-execute-text').show().text('Order placed!');
      } else {
        $('#manual-execute-text').show().text('Can\'t buy the order');
      }
    });
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

