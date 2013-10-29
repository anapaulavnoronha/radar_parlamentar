/*##############################################################################
#       Copyright (C) 2013  Diego Rabatone Oliveira, Leonardo Leite,           #
#                           Saulo Trento                                       #
#                                                                              #
#    This program is free software: you can redistribute it and/or modify      #
# it under the terms of the GNU Affero General Public License as published by  #
#      the Free Software Foundation, either version 3 of the License, or       #
#                     (at your option) any later version.                      #
#                                                                              #
#       This program is distributed in the hope that it will be useful,        #
#       but WITHOUT ANY WARRANTY; without even the implied warranty of         #
#        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         #
#             GNU Affero General Public License for more details.              #
#                                                                              #
#  You should have received a copy of the GNU Affero General Public License    #
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.     #
##############################################################################*/

// Versão para o hackathon cdep 2013

Plot = (function ($) {

    // Function to load the data and draw the chart
    function initialize(nome_curto_casa_legislativa) {
        //d3.json("/analises/analise/" + nome_curto_casa_legislativa + "/json_pca", _plot_data);
        //para testes com arquivo hardcoded
//        d3.json("/static/files/partidos.json", plot_data);
        d3.json("/static/files/exemplo_hackathon.json", plot_data);
    }

    function space_to_underline(name) {
      return name.replace(/\s+/g,'_');
    }
    
    function x(d) { return d.x; } 
    function y(d) { return d.y; } 
    function tamanho(d) { return d.t; } // era d.t
    function raio(d) { return d.r; }
    function presenca(d) { return d.p; }
    function cor(d) { return d.cor; } 
    function nome(d) { return space_to_underline(d.nome); } 
    function numero(d) { return d.numero; } 

    // Creates a "radialGradient"* for each circle
    // and returns the id of the just created gradient.
    // * the "radialGradient" is a SVG element
    function gradiente(svg,id,color) {
        DEFAULT_COLOR = "#1F77B4";
        if (color === "#000000") color = DEFAULT_COLOR;
        var identificador = "gradient-" + id;
        var gradient = svg.append("svg:defs")
                .append("svg:radialGradient")
                    .attr("id", identificador)
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "100%")
                    .attr("spreadMethod", "pad");

        gradient.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.5);

        gradient.append("svg:stop")
            .attr("offset", "70%")
            .attr("stop-color", color)
            .attr("stop-opacity", 1);
        return "url(#" + identificador + ")";
    }

    // Chart dimensions.
    var margin = {top: 20, right: 20, bottom: 20, left: 20},
        width_graph = 670,
        height_graph = 670,
        width = width_graph - margin.right - margin.left,
        height = height_graph - margin.top - margin.bottom,
        space_between_graph_and_control = 60,
        height_of_control = 80;

    // Various scales. These domains make assumptions of data, naturally.
    var xScale = d3.scale.linear().domain([-100, 100]).range([0, width]),
        yScale = d3.scale.linear().domain([-100, 100]).range([height, 0]);

    var periodo_min,
        periodo_max,
        periodo_de,
        periodo_para,
        periodo_atual,
        partidos,
        periodos;

    // Function that draws the chart
    function plot_data(dados) {
        // Inicialmente remove o spinner de loading
        $("#loading").remove();

        // Creates the SVG container and sets the origin.
        var svg_base = d3.select("#animacao").append("svg")
            .attr("width", width + margin.left + margin.right + 200)
            .attr("height", height + margin.top + margin.bottom + space_between_graph_and_control)
            .style("position", "relative");

        var grupo_controle_periodos = svg_base.append("g")
	    .attr("width", width)
	    .attr("height", height_of_control)
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var grupo_grafico = svg_base.append("g")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("transform", "translate(" + margin.left + "," + (margin.top + space_between_graph_and_control ) + ")");

        addBackground(grupo_grafico);

        // setando variáveis já declaradas
        partidos = dados.partidos;
        periodos = dados.periodos;
        periodo_min = 0;
        periodo_max = periodos.length-1;
        periodo_atual = periodo_min;
        periodo_para = periodo_atual;
        periodo_de = periodo_atual;

        var nome_periodo = periodos[periodo_atual].nome,
            nvotacoes = periodos[periodo_atual].nvotacoes;

        var label_periodo = grupo_controle_periodos.append("text")
            .attr("class", "year label")
            .attr("text-anchor", "middle")
            .attr("y", 30 )
            .attr("x", width/2)
            .text(nome_periodo);

        var label_nvotacoes = grupo_controle_periodos.append("text")
            .attr("class", "total_label")
            .attr("text-anchor", "middle")
            .attr("y", "48")
            .attr("x", width/2)
            .text("Votações analisadas no período: " + nvotacoes + " votações");

        var go_to_previous = grupo_controle_periodos.append("text")
            .attr("id", "previous_period")
            .attr("class", "previous")
            .attr("text-anchor", "middle")
            .attr("y", 20)
            .attr("x", 10)
            .text("<");

        var go_to_next = grupo_controle_periodos.append("text")
            .attr("id", "next_period")
            .attr("class", "next")
            .attr("text-anchor", "middle")
            .attr("y", 20)
            .attr("x", width-10 )
            .text(">");
        
        // adicionando controladores de movimentação de período 
//         TODO
//        interactPrevious();
        configure_go_to_next();

        // bisector searches for a value in a sorted array.
        var bisect = d3.bisector(function(d) { return d[0]; });

        var partidos_no_periodo = get_partidos_no_tempo(0)
            .filter(function(d){ return d.t > 0;});

        var grupo_main = grupo_grafico.append("g")
            .attr("id","parties")

        var parties = grupo_main.selectAll(".party") 
            .data(partidos_no_periodo, function(d) { return d.nome })
        .enter().append("g")
            .attr("class","party")
            .attr("id", function(d){return "group-"+nome(d);})
            .attr("transform", function(d) { return "translate(" + xScale(d.x[periodo_atual]) +"," +  yScale(d.y[periodo_atual]) + ")";});

        parties.append("circle")
            .attr("class", "party_circle")
            .attr("id", function(d) { return "circle-" + nome(d); })
            .attr("r", function(d) { return d.r[periodo_atual]; }) 
            .style("fill", function(d) { return gradiente(grupo_grafico, nome(d), cor(d)); });

        parties.append("text")
            .attr("dx", "-8")
            .attr("dy", "3")
            .text(function(d){ return numero(d);});
 
        // faz o nome do partido aparecer como tooltip qd se passa o mouse em cima do círculo
        parties.append("title")
            .text(function(d) { return nome(d); });

        parties.sort(order);

        // Primeira animação
//      TODO
//        startFirst();

        // Defines a sort order so that the smallest parties are drawn on top.
        function order(a, b) {
            if (a == null || b == null) console.log(parties, a, b);
            return tamanho(b) - tamanho(a);
        }

        // Primeira animação automática
        function startFirst() {
            // Seta períodos inicial e final de interpolação como
            //      período mínimo e máximo, respectivamente.
            periodo_de = periodo_min;
            periodo_para = periodo_max;

            // Começa a transição inicial ao entrar na página
            grupo_grafico.transition()
                .duration(10000)
                .ease("linear")
                .tween("year", tweenPeriod)
                .each("end", sortAll);
        }

        // ############## Funções de controle de mudanças de estado ###########
        
        // Função que controla mudança de estado para o estado seguinte
        function configure_go_to_next() {
            go_to_next
                .on("mouseover", mouseover_next)
                .on("mouseout", mouseout_next)
                .on("click", move_next_period);

            // TODO ver se dar pra remover ou mover pra move_next_period
            // Cancel the current transition, if any.
            grupo_grafico.transition().duration(0);
            
            // Função que gera o movimento para o próximo período
            function move_next_period() {
                if (periodo_atual < periodo_max) {
                    periodo_de = periodo_atual;
                    periodo_para = Math.floor(periodo_atual + 1); 
                    periodo_atual += 1;

                    parties = grupo_grafico.selectAll('.party').data(partidos_no_periodo, function(d) { return d.nome });
                    parties.transition()
                            .attr("transform", function(d) { return "translate(" + xScale(d.x[periodo_para]) +"," +  yScale(d.y[periodo_para]) + ")" });

//                    grupo_grafico.select('.party').transition()
//                    grupo_grafico.transition()
//                        .duration(1000)
//                        .ease("linear")
//                        .tween("year", tweenPeriod)
//                        .each("end", sortAll);
                    if (periodo_para == periodo_max) go_to_next.classed("active", false);
                }
            }

            // Função que controla o mouse over, indicando que o elemento está ativo
            function mouseover_next() {
                if (periodo_atual < periodo_max) go_to_next.classed("active", true);
            }

            // Função que controla o mouse out, indicando que o elemento não está mais ativo
            function mouseout_next() {
                if (periodo_atual < periodo_max) go_to_next.classed("active", false);
            }
        }

        // Função que controla a mudança de estado para o estado anterior
        function interactPrevious() {
            previous_period
                .on("mouseover", mouseover)
                .on("mouseout", mouseout)
                .on("click", move_previous);

            // Cancel the current transition, if any.
            grupo_grafico.transition().duration(0);

            function move_previous() {
                if (periodo_atual > periodo_min) {
                    periodo_de = periodo_atual;
                    periodo_para = Math.floor(periodo_atual - 1);
                    grupo_grafico.transition()
                        .duration(1000)
                        .ease("linear")
                        .tween("year", tweenPeriod)
                        .each("end", sortAll);

                    if (periodo_para == periodo_min) previous_period.classed("active", false);
                }
            }

            function mouseover() {
                if (periodo_atual > periodo_min) previous_period.classed("active", true);
            }

            function mouseout() {
                if (periodo_atual > periodo_min) previous_period.classed("active", false);
            }
        }
        
        function sortAll() {
            var partidos = grupo_grafico.selectAll(".party")
            partidos.sort(order);
        }

        // Tween == interpolar
        // Tweens the entire chart by first tweening the year, and then the data.
        // For the interpolated data, the parties and label are redrawn.
        function tweenPeriod() {
            return function(t) { displayPeriod(t); };
        }

        // Updates the display to show the specified period.
        // the received period is fractional
        function displayPeriod(t) {

            var interpolador = d3.interpolateNumber(periodo_de, periodo_para);
            var period = interpolador(t)
            periodo_atual = period;
            
            var partidos_no_tempo = get_partidos_no_tempo(t)
                .filter(function(d){ return tamanho(d) > 0;});

            var grupo_main = grupo_grafico.select("#parties");

            // atualiza os partidos existentes
            var parties = grupo_main.selectAll(".party")
                .data(partidos_no_tempo, function(d) { return d.nome })
                .attr("transform", function(d) { return "translate(" + xScale(x(d)) +"," +  yScale(y(d)) + ")";});

            // acrescenta novos partidos
            var party = parties.enter()
                .append("g")
                .attr("class","party")
                .attr("id", function(d){return "group-"+nome(d);})
                .attr("transform", function(d) { return "translate(" + xScale(x(d)) +"," +  yScale(y(d)) + ")";});
              
            party.append("circle")
                .attr("class", "party_circle")
                .attr("id", function(d) { return "circle-" + nome(d); })
                .attr("r", function(d) { return raio(d); })
                .style("fill", function(d) { return gradiente(grupo_grafico, nome(d), cor(d)); });

            party.append("text")
                .attr("dx", "-8")
                .attr("dy", "3")
                .text(function(d){ return numero(d);});

            // faz o nome do partido aparecer como tooltip qd se passa o mouse em cima do círculo
            party.append("title")
                .text(function(d) { return nome(d); });

            parties.exit().remove();
            label_periodo.text(periodos[Math.round(period)].nome);
            quantidade_votacoes = periodos[Math.round(period)].quantidade_votacoes
            label_nvotacoes.text(quantidade_votacoes + " votações");
        }

        // Retorna o partido com x, y, tamanho e raio para o período especificado
        function get_partidos_no_tempo(t) {
            return partidos.map(function(d) {
                var interpoladorR = d3.interpolateNumber(raio(d)[periodo_de], raio(d)[periodo_para]),
                    interpoladorX = d3.interpolateNumber(x(d)[periodo_de], x(d)[periodo_para]),
                    interpoladorY = d3.interpolateNumber(y(d)[periodo_de], y(d)[periodo_para]);
                var interpolador = d3.interpolateNumber(periodo_de, periodo_para);
                var period = interpolador(t);
                console.log(period);
                return {
                    nome: nome(d),
                    numero: numero(d),
                    cor: cor(d),
                    t: tamanho(d)[periodo_para], // tamanho(d) é lista de tamanhos
                    r: raio(d),
                    x: x(d),
                    y: y(d)
//                    r: interpoladorR(t),
//                    x: interpoladorX(t),
//                    y: interpoladorY(t)
//                    r: raio(d)[period], // raio(d) é lista de raios
//                    x: x(d)[period],
//                    y: y(d)[period]
//                    r: raio(d)[periodo_para],
//                    x: interpolateValues(x(d), period),
//                    y: interpolateValues(y(d), period)
                };
            });
        }

        // Finds (and possibly interpolates) the value for the specified year.
        function interpolateValues(values, period) {
            var i = bisect.left(values, period),
                a = values[i];
            if (i > 0) {
                var b = values[i - 1],
                    t = (period - a[0]) / (b[0] - a[0]);
                return a[1] * (1 - t) + b[1] * t;
            }
            return a[1];
        }
    }


    function addBackground(grupo_grafico) {
        var fundo = grupo_grafico.append("g")
            .attr("transform","translate(" + width/2 + "," + height/2 + ")");

        raio_fundo = Math.min(width,height)/2;

        fundo.append("circle")
            .attr("class", "radar_background")
            .attr("r", raio_fundo);

        var raio = 10;
        while (raio < raio_fundo) {
            fundo.append("circle")
                .attr("class", "raio_radar")
                .attr("r",raio);
            raio = raio + 40;
        }
    }

    return {
        initialize:initialize
    };
})(jQuery);
