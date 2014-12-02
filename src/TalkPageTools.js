/*
 * Altera a formatação dos tópicos das páginas de discussão, ocultando aqueles que não recebem novos comentários há alguns dias
 * @author: Helder (https://github.com/he7d3r)
 * @license: CC BY-SA 3.0 <https://creativecommons.org/licenses/by-sa/3.0/>
 */
( function ( mw, $ ) {
	'use strict';

	if ( mw.config.get( 'wgDBname' ) === 'ptwiki' ) {
		window.tpt = {
			extraTalkPages: [
				'Wikipédia:Café_dos_administradores', 'Wikipédia:Esplanada/propostas',
				'Wikipédia:Esplanada/geral', 'Wikipédia:Fusão/Central_de_fusões',
				'Wikipédia:Fontes_fiáveis/Central_de_fiabilidade'
			]
		};
	}

	var tpt = {
		collapseTopics: true,
		// TODO: Make sure this works as expected on multi level talk pages, when level != 2
		level: 2, // == <h2> Headings ==
		maxDays: 7,
		extraTalkPages: [],
		monthNames: {
			'en': [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ],
			'pt': [ 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro' ]
		},
		reTimeStamp: {
			'en': /(\d{1,2}):(\d{1,2}), (\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4}) \(UTC\)/gi,
			'pt': /(\d{1,2})h(\d{1,2})min de (\d{1,2}) de (janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro) de (\d{4}) \(UTC\)/gi
		},
		dateOrder: {
			// Change this for languages where the parts of the timestamps are in a different order
			// 'lang': { hours: #, minutes: #, day: #, month: #, year: # }
		},
		i18n: {
			'en': {
				'tpt-old-topic-text': 'This topic was last edited $1 days ago. Click on the section header to toggle the comments.',
				'tpt-unsigned-topic-text': 'All comments on this topic are unsigned.',
				'tpt-change-max-days': 'Duration of topics',
				'tpt-change-max-days-title': 'Change the number of days during which the topics stay open by default',
				'tpt-change-max-days-question': 'Do you want to automatically hide the topics last commented more than how many days ago?'
			},
			'pt': {
				'tpt-old-topic-text': 'Este tópico foi editado pela última vez há $1 dias. Clique no título da seção para exibir ou ocultar os comentários.',
				'tpt-unsigned-topic-text': 'Todos os comentários deste tópico estão sem assinatura.',
				'tpt-change-max-days': 'Tempo de duração dos tópicos',
				'tpt-change-max-days-title': 'Alterar o número de dias durante os quais os tópicos ficam exibidos por padrão',
				'tpt-change-max-days-question': 'Deseja ocultar automaticamente os tópicos cuja última edição ocorreu há mais de quantos dias?'
			}
		}
	};

	tpt.timeDistanceInDays = function ( d1, d2 ) {
		var diff = Math.floor( ( d1.getTime() - d2.getTime() ) / 86400000 ); // = 1000*60*60*24
		return diff;
	};

	tpt.getDates = function ( text ) {
		var lang = mw.config.get( 'wgContentLanguage' ),
			monthNames = tpt.monthNames[ lang ] || tpt.monthNames.en,
			reTimeStamp = tpt.reTimeStamp[ lang ] || tpt.reTimeStamp.en,
			defaultOrder = { hours: 1, minutes: 2, day: 3, month: 4, year: 5 },
			dateOrder = tpt.dateOrder[ lang ] || defaultOrder,
			match, date, dates = [];
		match = reTimeStamp.exec( text );
		while ( match ) {
			date = new Date();
			date.setUTCFullYear(
				match[ dateOrder.year],
				$.inArray( match[ dateOrder.month ].toLowerCase(), monthNames ),
				match[ dateOrder.day ]
			);
			date.setUTCHours(
				match[ dateOrder.hours ],
				match[ dateOrder.minutes ],
				0, // seconds
				0 // miliseconds
			);
			dates.push( date );
			match = reTimeStamp.exec( text );
		}
		return dates;
	};

	tpt.formatTalkPage = function () {
		var level = tpt.level,
			today = new Date(),
			open = false,
			$comments = $(),
			$header = $(),
			dates,
			$section,
			wrap = function ( $header, $comments, collapseTopics ) {
				var css = {
					'float': 'none',
					'cursor': 'pointer',
					'text-align': 'left',
					// [[phab:T62441#670801]]
					'-moz-user-select': 'all',
					'-webkit-user-select': 'all',
					'-ms-user-select': 'all',
					'user-select': 'all'
				};
				if ( collapseTopics ) {
					$header.addClass( 'mw-collapsible-toggle' )
						// mw.util.addCSS is too slow!
						.css( css )
						.add(
							$comments.wrapAll( '<div class="mw-collapsible-content"></div>' )
								.parent()
						).wrapAll( '<div class="topic mw-collapsible"></div>' );
				} else {
					$header.add( $comments )
						.wrapAll( '<div class="topic"></div>' );
				}
			};

		mw.util.addCSS([
			//'.topic h2.mw-collapsible-toggle {float:none; cursor: pointer; text-align: left;} ',
			//'.topic:hover {background-color: #FFE;} ',
			'div.ongoing-discussion {background-color:#FFF;} ',
			'.topic {background-color:#EEE;}'
		].join('\n'));

		// Based on http://stackoverflow.com/a/25873943/2062663
		$( '#mw-content-text' ).contents().each( function () {
			var $this = $( this ),
				$parent = $this.parent();
			if ( $this.is( 'h' + level )
				&& !$parent.is( '#toctitle' )
				&& !$parent.hasClass( 'lqt-contents-wrapper' )
				&& $this.attr( 'id' ) !== 'mw-previewheader'
				&& !$this.hasClass( 'lqt_header' )
				&& !$this.hasClass( 'diff-currentversion-title' )
			) {
				if ( open ) {
					wrap( $header, $comments, tpt.collapseTopics );
				}
				$header = $this;
				$comments = $();
				open = true;
			} else {
				$comments = $comments.add( $this );
			}
		} );
		if ( open ) {
			wrap( $header, $comments, tpt.collapseTopics );
		}
		$('.topic').each(function () {
			var days, maxDays,
				$this = $(this);

			dates = tpt.getDates( $this.text() );
			if ( dates.length === 0 ) {
				// This topic was not signed by anyone
				// TODO: maybe add a visible warning or change the color?
				$this.find('h2').after(
					$( '<i class="error" style="margin-bottom: 2em; display: block;"></i>' )
						.text( mw.msg( 'tpt-unsigned-topic-text' ) )
				);
				return true;
			}
			dates.sort( function (a, b) {return b - a;} ); // Descending order
			days = tpt.timeDistanceInDays( today, dates[0] );
			maxDays = $.cookie( mw.config.get('wgCookiePrefix') + 'tpt-maxDays' ) || tpt.maxDays;
			if ( days < maxDays ) {
				$this.addClass( 'ongoing-discussion' );
			} else if ( tpt.collapseTopics ) {
				$this.find('h2').after(
					$( '<i style="margin-bottom: 2em; display: block;"></i>' )
						.text( mw.msg( 'tpt-old-topic-text', days ) )
				);
				$this.addClass( 'mw-collapsed' );
			}
		});

		$( '.mw-collapsible' ).makeCollapsible();
		$( '#mw-content-text' ).show();
		$section = $('[id="' + window.location.hash.substr(1) + '"]');
		if ( $section.length ) {
			$('html, body').animate({
				scrollTop: $section.offset().top
			}, 0 );
		}
	};

	tpt.run = function () {
		if ( $('#ca-addsection').length > 0 || $.inArray( mw.config.get( 'wgPageName' ), tpt.extraTalkPages) !== -1 ) {
			var i18n = tpt.i18n.en;

			// Define language fallbacks
			tpt.i18n['pt-br'] = tpt.i18n.pt;

			// Replace default English interface by translation if available
			$.extend( true, i18n, tpt.i18n[ mw.config.get( 'wgUserLanguage' ) ] );

			// Define interface messages
			mw.messages.set( i18n );
			mw.loader.using( [
				'mediawiki.util',
				'jquery.makeCollapsible',
				'jquery.cookie'
			], tpt.formatTalkPage );
		}
	};
	tpt.addLink = function () {
		$( mw.util.addPortletLink(
			'p-cactions',
			'#',
			mw.msg( 'tpt-change-max-days' ),
			'#ca-tpt-max-days',
			mw.msg( 'tpt-change-max-days-title' )
		) ).click( function (e) {
			e.preventDefault(); // prevent '#' from appearing in URL bar
			mw.loader.using( 'jquery.cookie', function () {
				var days = prompt( mw.msg( 'tpt-change-max-days-question' ), '7' );
				if ( days === null ) {
					return;
				}
				$.cookie(
					mw.config.get('wgCookiePrefix') + 'tpt-maxDays',
					days,
					{
						expires: 1,
						path: '/'
					}
				);
				document.location.reload( false ); // Reloads the document (from the cache)
			} );
		} );
	};

	if ( window.tpt === undefined ) {
		window.tpt = tpt;
	} else if ( typeof window.tpt === 'object' ) {
		window.tpt = $.extend({}, tpt, window.tpt);
	}

	if ( $.inArray( mw.config.get('wgAction'), [ 'view', 'purge' ]) !== -1 ) {
		$( tpt.run );
		$( tpt.addLink );
	}

}( mediaWiki, jQuery) );
