var utils = require('../utils');
var helper = require('./helper');
var settings = require('../settings');
var iScroll = require('iscroll');
var session = require('../session');
var i18n = require('../i18n');
var moment = window.moment;
var backbutton = require('../backbutton');
var newGameForm = require('./newGameForm');

// iScroll instance
var scroller = null;

var gamesMenu = {};

gamesMenu.isOpen = false;

gamesMenu.open = function() {
  helper.analyticsTrackView('Games Menu');
  backbutton.stack.push(gamesMenu.close);
  gamesMenu.isOpen = true;
  setTimeout(function() {
    if (scroller) scroller.goToPage(1, 0);
  }, 400);
  if (utils.hasNetwork() && session.isConnected()) session.refresh();
};

gamesMenu.close = function(fromBB) {
  if (fromBB !== 'backbutton' && gamesMenu.isOpen) backbutton.stack.pop();
  gamesMenu.isOpen = false;
};

gamesMenu.lastJoined = null;

gamesMenu.joinGame = function(g) {
  gamesMenu.lastJoined = g;
  gamesMenu.close();
  m.route('/game/' + g.fullId);
  m.redraw();
};

function renderAllGames(nowPlaying) {

  function cardDims() {
    var vp = helper.viewportDim();
    var width = vp.vw * 85 / 100;
    var padding = vp.vw * 2.5 / 100;
    return {
      w: width + padding * 2,
      innerW: width,
      padding: padding
    };
  }

  function renderViewOnlyBoard(fen, lastMove, color, variant) {
    return m('div', {
      style: {
        height: cDim.innerW + 'px'
      }
    }, [
      helper.viewOnlyBoard(fen, lastMove, color, variant,
        settings.general.theme.board(), settings.general.theme.piece()
      )
    ]);
  }

  var cDim = cardDims();
  var cardStyle = {
    width: cDim.w + 'px',
    paddingLeft: cDim.padding + 'px',
    paddingRight: cDim.padding + 'px'
  };
  var nbCards = nowPlaying.length + 1;
  // scroller wrapper width
  // calcul is:
  // ((cardWidth + visible part of adjacent card) * nb of cards) +
  //   wrapper's marginLeft
  var wrapperWidth = ((cDim.w + cDim.padding * 2) * nbCards) +
    (cDim.padding * 2);

  var timeLeft = function(g) {
    if (!g.isMyTurn) return i18n('waitingForOpponent');
    if (!g.secondsLeft) return i18n('yourTurn');
    var time = moment().add(g.secondsLeft, 'seconds');
    return m('time', {
      datetime: time.format()
    }, time.fromNow());
  };

  var allGames = nowPlaying.map(function(g) {
    var icon = g.opponent.ai ? ':' : utils.gameIcon(g.perf);
    return m('div.card.standard.' + g.color, {
      key: 'game.' + g.gameId,
      style: cardStyle,
      config: helper.ontouchendScrollX(function() {
        gamesMenu.joinGame(g);
      })
    }, [
      renderViewOnlyBoard(g.fen, g.lastMove, g.color, g.variant),
      m('div.infos', [
        m('div.icon-game', {
          'data-icon': icon ? icon : ''
        }),
        m('div.description', [
          m('h2.title', utils.playerName(g.opponent, false)),
          m('p', [
            g.variant.name,
            m('span.time-indication', timeLeft(g))
          ])
        ])
      ])
    ]);
  });

  allGames.unshift(
    m('div.card.standard', {
      key: 'game.new-game',
      style: cardStyle,
      config: helper.ontouchendScrollX(function() {
        gamesMenu.close();
        newGameForm.open();
      })
    }, [
      renderViewOnlyBoard(),
      m('div.infos', [
        m('div.description', [
          m('h2.title', i18n('createAGame')),
          m('p', i18n('newOpponent')),
        ])
      ])
    ])
  );

  return m('div#all_games', {
    style: {
      width: wrapperWidth + 'px',
      marginLeft: (cDim.padding * 2) + 'px'
    }
  }, allGames);
}

gamesMenu.view = function() {
  if (!gamesMenu.isOpen) return m('div#games_menu.overlay.overlay_fade');
  var nowPlaying = session.nowPlaying();
  var children = [
    m('button.overlay_close.fa.fa-close', {
      config: helper.ontouchend(gamesMenu.close)
    }),
    m('div#wrapper_games', {
      config: function(el, isUpdate, context) {
        if (!isUpdate) {
          scroller = new iScroll(el, {
            scrollX: true,
            scrollY: false,
            momentum: false,
            snap: '.card',
            snapSpeed: 400,
            preventDefaultException: {
              tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|LABEL)$/
            }
          });

          context.onunload = function() {
            if (scroller) {
              scroller.destroy();
              scroller = null;
            }
          };
        }
        // see https://github.com/cubiq/iscroll/issues/412
        scroller.options.snap = el.querySelectorAll('.card');
        scroller.refresh();
      }
    }, renderAllGames(nowPlaying))
  ];

  return m('div#games_menu.overlay.overlay_fade.open', children);
};

module.exports = gamesMenu;
