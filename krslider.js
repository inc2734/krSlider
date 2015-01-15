/**
 * Plugin Name: KrSlider
 * Description: シンプルなスライドショーを実装するjQueryプラグイン
 * Version: 1.1.2
 * Author: Takashi Kitajima
 * Author URI: http://2inc.org
 * Created : March 25, 2014
 * Modified: January 15, 2014
 * License: GPLv2
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 *
 * @param string   type( fade, slide )       切り替えアニメーション
 * @param numeric  duration                  アニメーション時間（ms）
 * @param numeric  interval                  次のアニメーションまでのインターバル（ms）
 * @param string   easing                    イージング
 * @param bool     showNav                   ナビゲーションの表示
 * @param string   navStyle( string, image, title ) ナビゲーション種別
 * @param bool     showCaption               キャプションの表示
 * @param bool     showPrevNextNav           前後ナビの表示
 * @param string   prev_text                 前ナビの文字列
 * @param string   next_text                 後ナビの文字列
 * @param numeric  maxWidth                  幅指定（画像要素以外を使用する場合）
 * @param numeric  maxHeight                 高さ指定（画像要素以外を使用する場合）
 * @param bool     autoResize                自動リサイズ実行
 * @param bool     fullSize                  幅100%表示
 * @param string   theme                     テーマ用のクラス名
 * @param function afterMove                 スライド後のコールバック関数
 */
;( function( $ ) {
	$.fn.krslider = function( config ) {
		var defaults = {
			type           : 'fade',
			duration       : 800,
			interval       : 3000,
			easing         : 'swing',
			showNav        : false,
			navStyle       : 'string',
			showCaption    : false,
			showPrevNextNav: false,
			prev_text      : '&laquo;',
			next_text      : '&raquo;',
			maxWidth       : 0,
			maxHeight      : 0,
			autoResize     : false,
			fullSize       : false,
			theme          : false,
			afterMove      : function() {}
		};
		config = $.extend( defaults, config );

		return this.each( function() {
			var canvas = $( this );
			if ( config.theme ) {
				canvas.addClass( 'krslider-theme-' + config.theme );
			}
			if ( canvas.find( '.krslider-wrapper' ).length <= 0 ) {
				canvas.wrapInner( '<div class="krslider-wrapper" />' );
			}
			var wrapper = canvas.find( '.krslider-wrapper' );
			wrapper.wrapInner( '<div class="krslider-inner" />' );
			var inner = canvas.find( '.krslider-inner' );
			var images = inner.children( '*:not([class^="krslider-"])' );
			var cnt = images.length;
			var timer = null;
			var moving = false;
			var now = 0;
			var clickCount = 0;
			var slideDirection;
			var player = [];
			if ( config.showCaption === true ) {
				if ( canvas.find( '.krslider-caption-wrapper' ).length <= 0 ) {
					inner.after(
						$( '<div class="krslider-caption-wrapper" />' )
					);
				}
				var captionWrapper = canvas.find( '.krslider-caption-wrapper' );
			}
			if ( config.showNav === true && images.length > 1 ) {
				if ( canvas.find( '.krslider-nav' ).length <= 0 ) {
					inner.after( '<div class="krslider-nav" />' );
				}
			}
			if ( canvas.find( '.krslider-nav' ).length > 0 ) {
				var sliderNav = canvas.find( '.krslider-nav' );
			}
			if ( config.showPrevNextNav === true && images.length > 1 ) {
				if ( canvas.find( '.krslider-prev-next-nav' ).length <= 0 ) {
					inner.after( '<div class="krslider-prev-next-nav" />' );
				}
				var prevNextNav = canvas.find( '.krslider-prev-next-nav' );
			}
			wrapper.addClass( config.type );

			if ( config.autoResize === true ) {
				wrapper.addClass( 'auto-resize' );
				$( window ).resize( function() {
					methods.setInnerSize();
				} );
			}

			if ( config.fullSize === true ) {
				wrapper.addClass( 'full-size' );
			}

			$( window ).load( function() {
				var _player = [];
				images.each( function( i, e ) {
					$( e ).css( 'position', 'absolute' );
					if ( methods.isYoutube( $( e ) ) ) {
						$( e )
							.attr( 'id', 'youtube-' + i )
							.append( '<div id="youtube-iframe-' + i + '" />' );
						_player[i] = $( e );
					}

					var isTouch = ( 'ontouchstart' in window );
					var Y1;
					var Y2;
					$( e ).on( 'mousedown touchstart', function( e ) {
						if ( ! isTouch ) {
							e.preventDefault();
						} else {
							Y1 = e.originalEvent.touches[0].clientY;
						}
						var left = ( isTouch ) ? e.originalEvent.changedTouches[0].pageX : e.pageX;
						$( this ).data( 'touch-start', left );
					} )
					$( e ).on( 'mousemove touchmove', function( e ) {
						if ( isTouch ) {
							Y2 = e.originalEvent.touches[0].clientY;
							if ( Math.abs( Y1 - Y2 ) < 5 ) {
								e.preventDefault();
							}
						} else {
							e.preventDefault();
						}
						if ( $( this ).data( 'touch-start' ) ) {
							$( this ).data( 'touch-move', true );
						}
					} )
					$( e ).on( 'mouseup touchend', function( e ) {
						if ( ! isTouch ) e.preventDefault();
						if ( $( this ).data( 'touch-move' ) ) {
							if ( moving === false && cnt > 1 ) {
								var dataleft = $( this ).data( 'touch-start' );
								var left = ( isTouch ) ? e.originalEvent.changedTouches[0].pageX : e.pageX;
								var touchDirection = 'next';
								if ( dataleft < left ) {
									touchDirection = 'prev';
								}
								var key = ( now + 1 ) % cnt;
								if ( touchDirection == 'prev' ) {
									key = now % cnt - 1;
								}
								if ( touchDirection == 'prev' && config.type == 'slide' )
									slideDirection = 'left';
								methods.lotation( key );
							}
						}
						$( this ).removeData( 'touch-start' );
						if ( isTouch ) $( this ).removeData( 'touch-move' );
					} );
					$( e ).click( function() {
						if ( $( this ).data( 'touch-move' ) ) {
							$( this ).removeData( 'touch-move' );
							return false;
						}
						$( this ).removeData( 'touch-move' );
					} );
				} );
				if ( _player.length ) {
					var tag = document.createElement( 'script' );
					tag.src = "//www.youtube.com/iframe_api";
					var firstScriptTag = document.getElementsByTagName( 'script' )[0];
					firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );
					window.onYouTubeIframeAPIReady = function() {
						for ( var i in _player ) {
							var id = methods.getYoutubeId( _player[i] );
							player[i] = new YT.Player( 'youtube-iframe-' + i, {
								height: '390',
								width: '640',
								videoId: id
							} );
						};
					}
				}
				if ( typeof sliderNav !== 'undefined' ) {
					if ( config.showNav === true )
						methods.createSliderNav();
					sliderNav.find( 'ul li' ).on( 'click touchend', function() {
						if ( ! $( this ).hasClass( 'cur' ) && moving === false && cnt > 1 ) {
							var key = $( this ).data( 'key' );
							if ( key < now && config.type == 'slide' )
								slideDirection = 'left';
							methods.lotation( key );
						}
					} );
				}
				if ( typeof prevNextNav !== 'undefined' ) {
					methods.createPrevNextNav();
					prevNextNav.find( 'ul li' ).on( 'click touchend', function() {
						if ( moving === false && cnt > 1 ) {
							var key = $( this ).data( 'key' );
							if ( $( this ).hasClass( 'nav-prev' ) && config.type == 'slide' )
								slideDirection = 'left';
							methods.lotation( key );
						}
					} );
				}

				methods.setInnerSize();
				switch ( config.type ) {
					case 'slide' :
						slideDirection = 'right';
						images.each( function( i, e ) {
							$( e )
								.css( 'left', -i * inner.width() )
								.show();
						} );
						break;
					case 'fade' :
					default :
				}
				methods.start( 1 );
			} );

			var methods = {
				start: function( key ) {
					methods.showCaption( key - 1 );
					methods.setCurrentClass( key - 1 );
					if ( cnt > 1 && config.interval > 0 ) {
						timer = setTimeout( function() {
							methods.lotation( key );
						}, config.interval );
					}
				},
				lotation: function( key ) {
					clearTimeout( timer );
					switch ( config.type ) {
						case 'slide' :
							methods.type.slide( key, slideDirection );
							break;
						case 'fade' :
						default :
							methods.type.fade( key );
					}
					// 再度statを呼びそこでlocationが呼ばれることで処理を繰り返す。
					// ここでstartを呼ぶと、処理が完了していないのに実行されてしまうため
					// 各処理の後に実行されるprocessAfterMove内でstartを呼ぶ。
				},
				type: {
					fade: function( key ) {
						methods.processBeforeMove( key, function() {
							moving = true;
							images.fadeOut( config.duration );
							images.eq( key ).fadeIn( config.duration, config.easing, function() {
								methods.processAfterMove( key );
							} );
						} );
					},
					slide: function( key, direction ) {
						methods.processBeforeMove( key, function() {
							clickCount ++;
							moving = true;
							images.eq( key ).css( 'z-index', clickCount );
							switch ( direction ) {
								case 'left' :
									var position = -inner.width();
									var adding = '+=';
									slideDirection = 'right';
									break;
								case 'right' :
									var position = +inner.width();
									var adding = '-='
									break;
							}
							images.eq( key ).css( 'left', position );
							images.each( function( i, e ) {
								$( e ).stop( true, true ).animate( {
									'left': adding + inner.width()
								}, config.duration, config.easing, function() {
									// images全て動かすので、1回だけ実行するように
									if ( i === 0 )
										methods.processAfterMove( key );
								} );
							} );
						} );
					}
				},
				processBeforeMove: function( key, callback ) {
					if ( typeof captionWrapper !== 'undefined' ) {
						captionWrapper.css( 'z-index', clickCount + 2 );
					}
					if ( typeof sliderNav !== 'undefined' ) {
						sliderNav.css( 'z-index', clickCount + 2 );
					}
					if ( typeof prevNextNav !== 'undefined' ) {
						prevNextNav.css( 'z-index', clickCount + 2 );
					}
					if ( config.showCaption === true ) {
						captionWrapper
							.stop( true, true )
							.fadeOut( config.duration, function() {
								$( this ).hide();
							} );
					}
					callback();
				},
				processAfterMove: function( key ) {
					for ( var i in player ) {
						player[i].stopVideo();
					}
					moving = false;
					now = key;
					if ( typeof prevNextNav !== 'undefined' ) {
						methods.setNavPrevKey();
						methods.setNavNextKey();
					}
					config.afterMove();

					key ++;
					var target = key % cnt;
					if ( canvas.data( 'krslider:stop' ) !== true ) {
						methods.start( target );
					}
				},
				setNavPrevKey: function( key ) {
					prevNextNav.find( 'ul li.nav-prev' ).data( 'key', now % cnt - 1 );
				},
				setNavNextKey: function( key ) {
					prevNextNav.find( 'ul li.nav-next' ).data( 'key', ( now + 1 ) % cnt );
				},
				setCurrentClass: function( key ) {
					if ( typeof sliderNav !== 'undefined' ) {
						sliderNav.find( 'ul li' )
							.removeClass( 'cur' )
							.eq( key ).addClass( 'cur' );
					}
				},
				setInnerSize: function() {
					inner.css( {
						height: '',
						width : ''
					} );
					images.children( '*:not(img)' ).css( {
						height: '',
						width : ''
					} );

					var width = images.eq( 0 ).width();
					var height = images.eq( 0 ).height();
					if ( config.maxWidth ) {
						if ( config.maxWidth > width ) {
							width = width;
						} else {
							width = config.maxWidth;
						}
						height = Math.floor( config.maxHeight * width / config.maxWidth );
					}

					inner.css( {
						height: height,
						width : width
					} );
					var overwidth = 0;
					var left = '';
					if ( canvas.width() < inner.width() ) {
						overwidth = inner.width() - canvas.width();
						left = -overwidth / 2;
					}
					inner.css( 'left', left );
					images.children( '*:not(img)' ).css( {
						height: height,
						width : width
					} );
				},
				showCaption: function( key ) {
					if ( config.showCaption === true ) {
						var item = images.eq( key );
						var _caption = '';
						if ( item.data( 'caption' ) ) {
							_caption = $( '#' + item.data( 'caption' ) ).html();
						} else if ( item.children().data( 'caption' ) ) {
							_caption = $( '#' + item.children().data( 'caption' ) ).html();
						} else if ( item.attr( 'title' ) ) {
							_caption = item.attr( 'title' );
						} else if ( item.attr( 'alt' ) ) {
							_caption = item.attr( 'alt' );
						} else if ( item.children().attr( 'title' ) ) {
							_caption = item.children().attr( 'title' );
						} else if ( item.children().attr( 'alt' ) ) {
							_caption = item.children().attr( 'alt' );
						}
						if ( _caption ) {
							var caption = $( '<span />' ).append( _caption );
							captionWrapper
								.hide()
								.html( caption )
								.stop( true, true ).fadeIn( config.duration, function() {
									$( this ).show();
								} );
						}
					}
				},
				createSliderNav: function() {
					sliderNav.append( $( '<ul />' ) );
					images.each( function( i, e ) {
						if ( config.navStyle == 'string' ) {
							var navhtml = ( i + 1 );
						} else if ( config.navStyle == 'title' ) {
							var item = images.eq( i );
							var navhtml = item.data( 'title' );
							if ( !navhtml ) {
								if ( item.attr( 'title' ) ) {
									navhtml = item.attr( 'title' );
								} else if ( item.attr( 'alt' ) ) {
									navhtml = item.attr( 'alt' );
								} else if ( item.children().attr( 'alt' ) ) {
									navhtml = item.children().attr( 'alt' );
								} else if ( item.children().attr( 'alt' ) ) {
									navhtml = item.children().attr( 'alt' );
								}
							}
						} else if ( config.navStyle == 'image' ) {
							var src = '';
							var thumbnail = $( e ).data( 'thumbnail' );
							if ( typeof thumbnail !== 'undefined' ) {
								if ( typeof $( '#' + thumbnail ).get( 0 ) !== 'undefined' ) {
									if ( $( '#' + thumbnail ).get( 0 ).nodeName == 'IMG' )
										src = $( '#' + thumbnail ).attr( 'src' );
								}
							}
							if ( !src ) {
								// 画像のとき
								if ( e.nodeName == 'IMG' ) {
									src = $( e ).attr( 'src' );
								}
								// リンクのとき
								else if ( e.nodeName == 'A' ) {
									src = $( e ).children().attr( 'src' );
								}
								// 画像以外のとき
								else {
									// youtubeのとき
									if ( methods.isYoutube( $( e ) ) ) {
										var id = methods.getYoutubeId( $( e ) );
										if ( id !== null )
											src = '//img.youtube.com/vi/' + id + '/2.jpg';
									}
								}
							}
							if ( src ) {
								var navhtml = $( '<img />' ).attr( {
									src: src,
									alt: i + 1
								} );
							} else {
								var navhtml = $( '<div />' ).html( i + 1 );
							}
							navhtml.addClass( 'nav-thumbnail' );
						}
						if ( typeof navhtml !== 'undefined' ) {
							var nav = $( '<li />' )
									.addClass( 'nav-' + ( i + 1 ) )
									.data( 'key', ( i ) )
									.append( navhtml );
							if ( methods.isYoutube( $( e ) ) )
								nav.addClass( 'nav-youtube' );
							sliderNav.find( 'ul' ).append( nav );
						}
					} );
				},
				createPrevNextNav: function() {
					prevNextNav.append( $( '<ul />' ) );
					var _array = [ 'prev', 'next' ];
					for ( i = 0; i < _array.length; i ++ ) {
						var navhtml = config[_array[i] + '_text'];
						var nav = $( '<li />' )
								.addClass( 'nav-' + _array[i] )
								.append( navhtml );
						prevNextNav.find( 'ul' ).append( nav );
						methods.setNavPrevKey();
						methods.setNavNextKey();
					}
				},
				isYoutube: function( obj ) {
					if ( obj.hasClass( 'youtube' ) && typeof obj.data( 'uri' ) !== 'undefined' )
						return true;
				},
				getYoutubeId: function( obj ) {
					if ( !methods.isYoutube( obj ) )
						return;
					var id = obj.data( 'uri' ).match( /www\.youtube\.com\/watch\?v=([^&#]*)/ );
					if ( id !== null )
						return id[1];
				}
			};

		} );
	};
} )( jQuery );
