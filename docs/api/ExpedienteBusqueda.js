(function (factory) {
    if (typeof define === "function" && define.amd) {
        define(["jquery", "moment", "datatables"], factory);
    } else {
        factory(jQuery, moment);
    }
}(function ($, moment) {

    $.fn.dataTable.moment = function (format, locale) {
        var types = $.fn.dataTable.ext.type;

        // Add type detection
        types.detect.unshift(function (d) {
            // Strip HTML tags if possible
            if (d && d.replace) {
                d = d.replace(/<.*?>/g, '');
            }

            // Null and empty values are acceptable
            if (d === '' || d === null) {
                return 'moment-' + format;
            }

            return moment(d, format, locale, true).isValid()
                ? 'moment-' + format
                : null;
        });

        // Add sorting method - use an integer for the sorting
        types.order['moment-' + format + '-pre'] = function (d) {
            if (d && d.replace) {
                d = d.replace(/<.*?>/g, '');
            }
            return d === '' || d === null
                ? -Infinity
                : parseInt(moment(d, format, locale, true).format('x'), 10);
        };
    };

}));

jQuery(function ($) {


    $.fn.dataTable.moment('DD/MM/YYYY HH:mm:ss');
    // Portlets (boxes)
    $(document).on('shown.bs.tab', 'a[data-toggle="tab"]', function (e) {
        //console.log(e.target) // activated tab
    })
    //focus para elementos
    $('#nroExpediente').focus();
    $('#tab-busquedas-exactas').click(function () {
        $('#nroExpediente').focus();
    });

    $('#tab-busquedas-avanzadas').click(function () {
        $('#txbFechaDesde').focus();
    });

    $('.widget-container-span').sortable({
        connectWith: '.widget-container-span',
        items: '> .widget-box',
        opacity: 0.8,
        revert: true,
        forceHelperSize: true,
        placeholder: 'widget-placeholder',
        forcePlaceholderSize: true,
        tolerance: 'pointer'
    });
    $('#b_simple').keypress(function (event) {

        if (event.keyCode == 10 || event.keyCode == 13)
            event.preventDefault();

    });

    //datepicker plugin
    //link
    $('.date-picker').datepicker({
        //autoclose: true,
        todayHighlight: true,
        language: 'es'
    })
         

    //or change it into a date range picker
    $('.input-daterange').datepicker({
        autoclose: true
    });

     


});
$(document).ready(function () {
    $(".interno").each(function () {
        if (EsInterno == "true" && $(this).hasClass("hide")) {
            $(this).removeClass("hide");
        }
        if (EsInterno == "false" && !$(this).hasClass("hide")) {
            $(this).addClass("hide");
        }
    });
    //busco los tipos de proyecto
    $.ajax({
        url: '../webservices/Json.asmx/GetTiposProyecto',
        type: 'POST',
        data: {},
        success: function (doc) {
            var select = $('#selTiposProyectos');

            var select2 = $('#selTiposDespachos');


            $(doc).find('ArrayOfTiposproyecto').each(function () {
                $(doc).find('tiposproyecto').each(function () {

                    var id_proyecto_tipo = $(this).find('id_proyecto_tipo').text();
                    var proyecto_tipo = $(this).find('proyecto_tipo').text();

                    select.append($("<option />").val(id_proyecto_tipo).text(proyecto_tipo));
                    select2.append($("<option />").val(id_proyecto_tipo).text(proyecto_tipo));

                });
            });
            select.children(":first").text(" ").attr("selected", true);
            select2.children(":first").text(" ").attr("selected", true);
        }
    });

     
    $('#dashboard-page').addClass('active');


});

function GetKeyAutores(source, eventArgs) {

    var divM = "<div class='itemdiv memberdiv autorExterno' id='AutorExt_" + eventArgs.get_value() + "' > "
        + "<div class='user'> "
        + "<img alt='' src='/assets/avatars/avatar2.png'> "
        + "</div> "
        + "<div class='body'> "
        + "<div class='name'> "
        + "<a href='#'>" + eventArgs.get_text() + "</a> "
        + "</div> "
        + "<div> "
        + "<span class='label label-default'>Opciones</span> "
        + "<div class='inline position-relative'> "
        + "<button class='btn btn-xser bigger btn-yellow dropdown-toggle' data-toggle='dropdown'> "
        + "<i class='fa fa-angle-down fa fa-only bigger-120'></i> "
        + "</button> "
        + "<ul class='dropdown-menu dropdown-fa fa-only dropdown-yellow pull-right dropdown-caret dropdown-close'> "
        + "<li> "
        + "<a data-original-title='Autor Coautor' href='#' class='tooltip-success' data-rel='tooltip' title=''> "
        + "<span class='green'> "
        + "<div class='control-group'>"
        + "<label class='control-label'>Autor/Coautor</label>"
        + "<div class='controls'>"
        + "<label>"
        + "<input name='form-field-radio' class='ace' type='radio' checked>"
        + "<span class='lbl'> Solo Autor</span>"
        + "</label>"
        + "<label>"
        + "<input name='form-field-radio' class='ace' type='radio'>"
        + "<span class='lbl'> Solo Coautor</span>"
        + "</label>"
        + "<label>"
        + "<input name='form-field-radio' class='ace' type='radio'>"
        + "<span class='lbl'> Autor / Coautor</span>"
        + "</label>"
        + "</div>"
        + "</div>"
        + "</span> "
        + "</a> "
        + "</li> "
        +

        "<li> "
        + "<a data-original-title='Quitar' onclick='$(\"#AutorExt_" + eventArgs.get_value() + "\").remove();' class='tooltip-error' data-rel='tooltip' title=''> "
        + "<span class='red'> "
        + "<i class='fa fa-trash bigger-110'></i> "
        + "</span> "
        + "</a> "
        + "</li> "
        + "</ul> "
        + "</div> "
        + "</div> "
        + "</div> "
        + "</div>		 ";
    //$('#sel-autores-ext').append('<li data-type="autores_ext" id="ext_' + eventArgs.get_value() + '" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');
    //$('#sel-autores-ext').append(divM);
    console.log('autor', $('#autor_' + eventArgs.get_value()).length);
    if ($('#autor_' + eventArgs.get_value() ).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {
        $('#sel-autores-int').append('<li data-type="autores_int" data-id="' + eventArgs.get_value() + '" id="autor_' + eventArgs.get_value() + '"  class="list-group-item d-flex justify-content-between align-items-center">' + eventArgs.get_text() + '"  <button type="button" class="close" data-dismiss="alert" aria-label="Close">    <span aria-hidden="true">&times;</span>  </button></li>');

    }
    //$('#sel-autores-ext').append('<li data-type="autores_ext" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');
    /*
    <div class="alert alert-warning alert-dismissible fade show" role="alert">
  <strong>Holy guacamole!</strong> You should check in on some of those fields below.
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>
    */

    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
    $("#ctl00_ContentPlaceHolder1_txtAutor").val('');
}

function GetKeyAutoresInternos(source, eventArgs) {

    if ($('#autor_' + eventArgs.get_value()).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {


        $('#sel-autores-int').append('<li data-type="autores_int" data-id="' + eventArgs.get_value() + '" id="autor_' + eventArgs.get_value() + '" class="list-group-item d-flex justify-content-between align-items-center">' + eventArgs.get_text() + '  <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar" onclick="$( this ).parent().remove();">    <span aria-hidden="true">&times;</span>  </button></li>');
        //$('#sel-autores-int').append('<li data-type="autores_int" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');

        jqueryGritter("Autor Seleccionado", "Se ha agregado a " + eventArgs.get_text() + " a las opciones de busqueda", "info", "");
    }
    $("#ContentPlaceHolder1_txtAutorInterno").val('');
}

function GetKeyUbicacion(source, eventArgs) {
    //$("#ctl00_ContentPlaceHolder1_LblKey1").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    //$('#sel-ubicacion').append('<li data-type="ubicaciones" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');

    if ($('#ubicacion_' + eventArgs.get_value()).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {
        $('#sel-ubicacion').append('<li data-type="ubicaciones" data-id="' + eventArgs.get_value() + '" id="ubicacion_' + eventArgs.get_value() + '" class="list-group-item d-flex justify-content-between align-items-center">' + eventArgs.get_text() + ' <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar" onclick="$( this ).parent().remove();">    <span aria-hidden="true">&times;</span>  </button></li>');

        jqueryGritter("Ubicacion Seleccionada", "Se ha agregado a " + eventArgs.get_text() + " a las opciones de busqueda", "info", "");
    }
    $("#ContentPlaceHolder1_ubicacion").val('');
    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
}
/*
function GetKeyProyectosTipo(source, eventArgs) {
    //$("#ctl00_ContentPlaceHolder1_LblKey2").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    $('#sel-tipo-proyecto').append('<li data-type="proyectos_tipo" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');
    $("#ctl00_ContentPlaceHolder1_proyecto_tipo").val('');
    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
}
*/

function GetKeyProyectosTipo() {

    var selected = $('#selTiposProyectos option:selected');

    var txt = selected.text();
    var val = selected.val();

    //$("#ctl00_ContentPlaceHolder1_LblKey2").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    //$('#sel-tipo-proyecto').append('<li data-type="proyectos_tipo" data-id="' + val + '">' + txt + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');

    if ($('#tipo_' + val).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {

        $('#sel-tipo-proyecto').append('<li data-type="proyectos_tipo" data-id="' + val + '" id="tipo_' + val + '" class="list-group-item d-flex justify-content-between align-items-center">' + txt + '<button type="button" class="close" data-dismiss="alert" aria-label="Cerrar" onclick="$( this ).parent().remove();">    <span aria-hidden="true">&times;</span>  </button></li>');


        queryGritter("Tipo de Proyecto Seleccionado", "Se ha agregado a " + txt + " a las opciones de busqueda", "info", "");
    }
    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
}

function GetKeyEstados(source, eventArgs) {
    //$("#ctl00_ContentPlaceHolder1_LblKey4").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    //$('#sel-estado').append('<li data-type="estados" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');

    if ($('#estado_' + eventArgs.get_value()).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {
        $('#sel-estado').append('<li data-type="estados" data-id="' + eventArgs.get_value() + '" id="estado_' + eventArgs.get_value() + '" class="list-group-item d-flex justify-content-between align-items-center">' + eventArgs.get_text() + ' <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar" onclick="$( this ).parent().remove();">    <span aria-hidden="true">&times;</span>  </button></li>');

        jqueryGritter("Estado Seleccionado", "Se ha agregado a " + eventArgs.get_text() + " a las opciones de busqueda", "info", "");
    }
    $("#ContentPlaceHolder1_estado").val('');
    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
}

function GetKeyDespachosTipo(source, eventArgs) {
    /*
    //$("#ctl00_ContentPlaceHolder1_LblKey2").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    $('#sel-tipo-despacho').append('<li data-type="proyectos_tipo" data-id="' + eventArgs.get_value() + '">' + eventArgs.get_text() + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');
    jqueryGritter("Tipo Despacho Seleccionado", "Se ha agregado a " + eventArgs.get_text() + " a las opciones de busqueda", "info", "");
    $("#ctl00_ContentPlaceHolder1_txtDespachoTipo").val('');
    //$("#ctl00_ContentPlaceHolder1_LblKey").html(eventArgs.get_value());
    */
    var selected = $('#selTiposDespachos option:selected');

    var txt = selected.text();
    var val = selected.val();

    //$("#ctl00_ContentPlaceHolder1_LblKey2").append(eventArgs.get_text() + ' val ' + eventArgs.get_value());
    //$('#sel-tipo-despacho').append('<li data-type="proyectos_tipo" data-id="' + val + '">' + txt + '<button class="close btn-xser" data-dismiss="alert" type="button"><i class=" fa fa-times red"></i></button></li>');
    if ($('#destipo_' + val).length)         // use this if you are using id to check
    {
        jqueryGritter("Valor Seleccionado", "Ya se encuentra en los filtros previos", "warning", "");
        // it exists
    } else {
        $('#sel-tipo-despacho').append('<li data-type="proyectos_tipo" data-id="' + val + '" id="destipo_' + val + '" class="list-group-item d-flex justify-content-between align-items-center">' + txt + ' <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar" onclick="$( this ).parent().remove();">    <span aria-hidden="true">&times;</span>  </button></li>');
        jqueryGritter("Tipo de Despacho Seleccionado", "Se ha agregado a " + txt + " a las opciones de busqueda", "info", "");
    }
}
$(function () {
    $('#despacho-exacto').keydown(function (e) {
        if (e.keyCode == 13) {

            $("#find-despacho").trigger('click');

            return false;
        }
    })
    $("#find-despacho").click(function () {

        var nroSrch = $('#nroDespacho').val();
        var anoSrch = $('#anoDespacho').val();
        if ((nroSrch == '') || (anoSrch == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_D' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetDespachoNroAno',
                dataType: 'XML',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    // our hypothetical feed requires UNIX timestamps
                    nroDespacho: nroSrch,
                    anoDespacho: anoSrch
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";

                    if ($(doc).find('despacho').size() > 0) {
                        $(doc).find('ArrayOfDespacho').each(function () {
                            $(doc).find('despacho').each(function () {

                                var id_expediente = $(this).find('id_expediente').text();
                                var id_despacho = $(this).find('id_despacho').text();
                                var nro_despacho = $(this).find('nro_despacho').text();
                                var sumario = $(this).find('sumario').text();
                                var fch_publicacion = $(this).find('fch_publicacion').text();
                                var fch_vencimiento_observaciones = $(this).find('fch_vencimiento_observaciones').text();
                                var tipo_proyecto_des = $(this).find('tipo_proyecto_des').text();
                                var es_preferencia = $(this).find('es_preferencia').text();
                                var TieneSancion = $(this).find('TieneSancion').text();

                                //console.log("TieneSancion:" + TieneSancion);
                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {
                                    var urlDoc = "<a title='Descargar Despacho' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                    if (urlDoc == '') {
                                        urlDoc = 'SIN DOCUMENTO'
                                    }
                                }
                                htmlString = " <table class='table table-dark table-bordered table-hover'> "
                                    + "<tbody> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Despacho "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	     <a title='Abrir Expediente para el Despacho " + nro_despacho + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_despacho + "</a> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Fecha Publicacion "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_publicacion + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Fecha Vencimiento Observaciones "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_vencimiento_observaciones + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Sumario "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + sumario
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Tipo Proyecto "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + tipo_proyecto_des + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Es de Preferencia? "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + es_preferencia + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Documento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + urlDoc + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Estado sanción: "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + (TieneSancion == '1' ? "<a title='Ver sancion' href='expediente.aspx?id=" + id_expediente + "&tab=sancion' rel='iframe[pf]' >SANCIONADO</a> " : "<span>NO SANCIONADO</span>")
                                    + "	</td> "
                                    + "	</tr> "
                                    + "</tbody> "
                                    + "	</table></div>";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_D' + nroSrch + '-' + anoSrch + '').html(htmlString);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a class="nav-link " href="#new_tab_D' + nroSrch + '-' + anoSrch + '" data-toggle="tab">Despacho ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_D" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });


                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_D' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                     
                    removeLoaderOverlay();
                }
            });
        }
        
        return false;
    });
    $('#bae-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-bae").trigger('click');

            return false;
        }
    })
    $("#find-bae").click(function () {
        
        var nroSrch = $('#nroBae').val();
        var anoSrch = $('#anoBae').val();

        if ((nroSrch == '') || (anoSrch == '')) {

            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_B' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetBAENroAno',
                dataType: 'XML',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    // our hypothetical feed requires UNIX timestamps
                    nroOrden: nroSrch,
                    anoParlamentario: anoSrch
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";

                    if ($(doc).find('bae').size() > 0) {
                        $(doc).find('ArrayOfBae').each(function () {
                            $(doc).find('bae').each(function () {

                                var id_bae = $(this).find('id_bae').text();
                                var nro_de_orden = $(this).find('nro_de_orden').text();
                                var ano_parlamentario = $(this).find('ano_parlamentario').text();
                                var fch_desde = $(this).find('fch_desde').text();
                                var fch_hasta = $(this).find('fch_hasta').text();
                                 
                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {
                                    urlDoc = "<a title='Descargar BAE' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                } else {
                                     
                                        //urlDoc = 'SIN DOCUMENTO'
                                        urlDoc = "<a title='Ver BAE' class='' target='_blank' href='BAEDigital.aspx?o=" + nro_de_orden + "&a=" + ano_parlamentario + "'>Ver BAE <i class='fa fa-window-open'></i></a>";

                                     
                                }
                                 
                                //var urlDoc = "<a title='Ver BAE' class='' target='_blank' href='BAEDigital.aspx?o=" + nro_de_orden + "&a=" + ano_parlamentario +"'>Ver BAE <i class='fa fa-window-open'></i></a>";

                                htmlString = " <table class='table table-dark table-bordered table-hover'> "
                                    + "<tbody> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Nro Boletin "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + nro_de_orden + "-" + ano_parlamentario + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Desde "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_desde + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Hasta "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_hasta + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Documento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + urlDoc + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "</tbody> "
                                    + "	</table>";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_B' + nroSrch + '-' + anoSrch + '').html(htmlString);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a class="nav-link " href="#new_tab_B' + nroSrch + '-' + anoSrch + '" data-toggle="tab">BAE ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_B" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_B' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                    removeLoaderOverlay();

                }
            });
        }
        
        return false;
    });
    $('#expediente-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-expediente").trigger('click');

            return false;
        }
    })
    $("#find-expediente").click(function () {

        var nroSrch = $('#nroExpediente').val();
        var anoSrch = $('#anoExpediente').val();

        if ((nroSrch == '') || (anoSrch == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            //initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane show vivify fadeIn active" id="new_tab_E' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            jqueryGritter("Atención", "Buscando Expte "+nroSrch+"-"+anoSrch, "warning", "");
            $.ajax({
                url: '../webservices/Json.asmx/GetExpedienteByNroyAnio',
                dataType: 'XML',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    // our hypothetical feed requires UNIX timestamps
                    NroExpediente: nroSrch,
                    AnioExpediente: anoSrch
                     
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";
                    //console.log(doc);

                    if ($(doc).find('expedienteAvanzado').size() > 0) {
                        $(doc).find('expedienteAvanzado').each(function () {
                             
                            var id_expediente = $(this).find('id_expediente').text();
                            var nro_de_expediente = $(this).find('nro_de_expediente').text();
                            var fch_inicio = $(this).find('fch_inicio').text();


                            var autor_des = $(this).find('autor_des').text();
                            var coautores_des = $(this).find('coautores_des').text().split(';');

                            var autor_id = $(this).find('autor_id').text();
                            var coautores_id = $(this).find('coautores_id').text().split(';');

                            var leg_coautor = '';
                            $.each(coautores_des, function (index, value) {
                                leg_coautor = leg_coautor + " [<a href='legislador.aspx?id=" + coautores_id[index].replace(/ /g, '') + "' rel='iframe[legislador]' >" + value + "</a>]";

                            });
                            var tipo_proyecto_des = $(this).find('tipo_proyecto_des').text();
                            var fch_movimiento = $(this).find('fch_movimiento').text();
                            var ubicacion_des = $(this).find('ubicacion_des').text();
                            var descripcion = $(this).find('descripcion').text();
                            var sumario = $(this).find('sumario').text();
                            var id_proyecto_tipo = $(this).find('id_proyecto_tipo').text();
                            var id_business_party = $(this).find('id_business_party').text();
                            var nro_de_orden_JefeGob = $(this).find('nro_de_orden_JefeGob').text();
                            var TieneSancion = $(this).find('TieneSancion').text();
                            var TieneDigitalizacion = $(this).find('TieneDigitalizacion').text();
                            var FechaDigitalizacion = $(this).find('fch_antecedente').text();
                            var FechaInsertDigitalizacion = $(this).find('fecha_insert_antecedente').text();
                            var FechaUpdateDigitalizacion = $(this).find('fecha_update_antecedente').text();
                            var iddocumento_antecedente = $(this).find('iddocumento_antecedente').text();

                            //console.log("TieneSancion:" + TieneSancion);

                            var TieneEstadoParlamentario;
                            //console.log($(this).find('TieneEstadoParlamentario').text());
                            if ($(this).find('TieneEstadoParlamentario').text() != "False") {
                                TieneEstadoParlamentario = "";
                            } else {
                                TieneEstadoParlamentario = "(SIN ESTADO PARLAMENTARIO)";
                            }
                            var urlDoc = "";
                            if ($(this).find('urlDoc').text() > 0) {

                                var urlDoc = "<a title='Descargar Expediente' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                if (urlDoc == '') {
                                    urlDoc = 'SIN DOCUMENTO'
                                }
                            }
                            htmlString = " <div class=' table-responsive'><table class='table table-dark table-bordered table-hover'> "
                                + "<tbody> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Expediente "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <a title='Abrir Expediente " + nro_de_expediente + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_de_expediente + "</a> " + TieneEstadoParlamentario
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Fecha Inicio "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <span class=''>" + fch_inicio + "</span> "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Autor "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <a  href='legislador.aspx?id=" + autor_id + "' rel='iframe[legislador]' > " + autor_des + " </a>"
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Coautores "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    " + leg_coautor + " "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Tipo "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <span class=''>" + tipo_proyecto_des + "</span> "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Ultimo Movimiento "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <span class=''>" + fch_movimiento + "</span> "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Ubicacion "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <span class=''>" + ubicacion_des + "</span> "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Estado "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    <span class=''>" + descripcion + "</span> "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Sumario "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    " + sumario + " "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Documento "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + "	    " + urlDoc + " "
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td> "
                                + "		<span class='blue arrowed-in arrowed-in-right'> "
                                + "       Estado sanción: "
                                + "      </span> "
                                + "     </td>"
                                + "	<td> "
                                + (TieneSancion == '1' ? "<a title='Ver sancion' href='expediente.aspx?id=" + id_expediente + "&tab=sancion' rel='iframe[pf]' >SANCIONADO</a> " : "<span>NO SANCIONADO</span>")
                                + "	</td> "
                                + "	</tr> "
                                + "	<tr> "
                                + "		<td colspan=2> "  
                                + (TieneDigitalizacion == '1' ? "<a title='Ver Digitalizacion' target='_blank' href='download.aspx?IdDoc=" + iddocumento_antecedente + "'  > Disponible Proyecto Digitalizado al " + FechaInsertDigitalizacion + "  <i class='fa fa-folder'></i></a> " : "<span>NO Digitalizado</span>")
                                + "	</td> "
                                + "	</tr> "
                                + "</tbody> "
                                + "	</table></div>";
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_E' + nroSrch + '-' + anoSrch + '').html(htmlString);


                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a href="#new_tab_E' + nroSrch + '-' + anoSrch + '" data-toggle="tab" class="nav-link ">Expediente ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    //$('#resExactos').append('<li id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a href="#new_tab_E' + nroSrch + '-' + anoSrch + '" data-toggle="tab">Expediente ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_E" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_E' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    } else {
                         
                    }
                    removeLoaderOverlay();
                    
                }
            });
        }
        
        return false;
    });
    $('#nroejecutivo-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-nro-ejecutivo").trigger('click');

            return false;
        }
    })
    $("#find-nro-ejecutivo").click(function () {

        var nroSrch = $('#nro_ejecutivo').val();
        var anoSrch = $('#ano_ejecutivo').val();

        if ((nroSrch == '') || (anoSrch == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_NroEje' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetExpedienteByNroEjecutivo',
                //dataType: 'json',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    NumeroEjecutivo: nroSrch,
                    AnoEjecutivo: anoSrch
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                },
                success: function (doc) {
                    var htmlString = "";

                    if ($(doc).find('expedienteAvanzado').size() > 0) {
                        $(doc).find('ArrayOfExpedienteAvanzado').each(function () {
                            $(doc).find('expedienteAvanzado').each(function () {


                                var id_expediente = $(this).find('id_expediente').text();
                                var nro_de_expediente = $(this).find('nro_de_expediente').text();
                                var fch_inicio = $(this).find('fch_inicio').text();
                                var autor_des = $(this).find('autor_des').text();
                                var coautores_des = $(this).find('coautores_des').text();
                                var tipo_proyecto_des = $(this).find('tipo_proyecto_des').text();
                                var fch_movimiento = $(this).find('fch_movimiento').text();
                                var ubicacion_des = $(this).find('ubicacion_des').text();
                                var descripcion = $(this).find('descripcion').text();
                                var sumario = $(this).find('sumario').text();
                                var id_proyecto_tipo = $(this).find('id_proyecto_tipo').text();
                                var id_business_party = $(this).find('id_business_party').text();
                                var nro_de_orden_JefeGob = $(this).find('nro_de_orden_JefeGob').text();

                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {

                                    var urlDoc = "<a title='Descargar Expediente " + nro_de_expediente + "' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                    if (urlDoc == '') {
                                        urlDoc = 'SIN DOCUMENTO'
                                    }
                                }
                                htmlString = " <table class='table table-dark table-bordered table-hover'> "
                                    + "<tbody> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Expediente "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <a title='Abrir Expediente " + nro_de_expediente + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_de_expediente + "</a> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Fecha Inicio "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_inicio + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Autor "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + autor_des + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Coautores "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + coautores_des + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Tipo "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + tipo_proyecto_des + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Ultimo Movimiento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_movimiento + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Ubicacion "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + ubicacion_des + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Estado "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + descripcion + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Sumario "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + sumario + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Documento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + urlDoc + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "</tbody> "
                                    + "	</table>";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_NroEje' + nroSrch + '-' + anoSrch + '').html(htmlString);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a class="nav-link " href="#new_tab_NroEje' + nroSrch + '-' + anoSrch + '" data-toggle="tab">Numero Ej. ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_NroEje" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_NroEje' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                     

                }
            });
        }
        removeLoaderOverlay();
        return false;
    });

    $('#mensajeejecutivo-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-mensaje-ejecutivo").trigger('click');

            return false;
        }
    })
    $("#find-mensaje-ejecutivo").click(function () {

        var nroSrch = $('#mensaje_ejecutivo').val();
        var anoSrch = $('#ano_mensaje_ejecutivo').val();

        if ((nroSrch == '') || (anoSrch == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_MsEje' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetMensajeByMensajeEjecutivo',
                //dataType: 'json',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    MensajeEjecutivo: nroSrch,
                    AnoEjecutivo: anoSrch
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";

                    if ($(doc).find('expedienteAvanzado').size() > 0) {
                        $(doc).find('ArrayOfExpedienteAvanzado').each(function () {
                            $(doc).find('expedienteAvanzado').each(function () {


                                var id_expediente = $(this).find('id_expediente').text();
                                var nro_de_expediente = $(this).find('nro_de_expediente').text();
                                var fch_inicio = $(this).find('fch_inicio').text();
                                var autor_des = $(this).find('autor_des').text();
                                var coautores_des = $(this).find('coautores_des').text();
                                var tipo_proyecto_des = $(this).find('tipo_proyecto_des').text();
                                var fch_movimiento = $(this).find('fch_movimiento').text();
                                var ubicacion_des = $(this).find('ubicacion_des').text();
                                var descripcion = $(this).find('descripcion').text();
                                var sumario = $(this).find('sumario').text();
                                var id_proyecto_tipo = $(this).find('id_proyecto_tipo').text();
                                var id_business_party = $(this).find('id_business_party').text();
                                var nro_de_orden_JefeGob = $(this).find('nro_de_orden_JefeGob').text();

                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {

                                    var urlDoc = "<a title='Descargar Expediente " + nro_de_expediente + "' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                    if (urlDoc == '') {
                                        urlDoc = 'SIN DOCUMENTO'
                                    }
                                }
                                htmlString = "<table class='table table-dark table-bordered table-hover'> "
                                    + "<tbody> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Expediente "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <a title='Abrir Expediente " + nro_de_expediente + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_de_expediente + "</a> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Fecha Inicio "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_inicio + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Autor "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + autor_des + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Coautores "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + coautores_des + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Tipo "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + tipo_proyecto_des + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Ultimo Movimiento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + fch_movimiento + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Ubicacion "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + ubicacion_des + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Estado "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    <span class=''>" + descripcion + "</span> "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Sumario "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + sumario + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "	<tr> "
                                    + "		<td> "
                                    + "		<span class='blue arrowed-in arrowed-in-right'> "
                                    + "       Documento "
                                    + "      </span> "
                                    + "     </td>"
                                    + "	<td> "
                                    + "	    " + urlDoc + " "
                                    + "	</td> "
                                    + "	</tr> "
                                    + "</tbody> "
                                    + "	</table>";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_MsEje' + nroSrch + '-' + anoSrch + '').html(htmlString);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a class="nav-link " href="#new_tab_MsEje' + nroSrch + '-' + anoSrch + '" data-toggle="tab">Mensaje Ej. ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_MsEje" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_MsEje' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                     removeLoaderOverlay();

                }
            });
        }
        
        return false;
    });

    $('#resolucion-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-sancionRD").trigger('click');

            return false;
        }
    })
    $("#find-sancionRD").click(function () {

        var nroSrch = $('#nroSanRD').val();
        var anoSrch = $('#anoSanRD').val();

        if ((nroSrch == '') || (anoSrch == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_S' + nroSrch + '-' + anoSrch + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetSancionNroOrdenAnoParlamentario',
                dataType: 'XML',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    // our hypothetical feed requires UNIX timestamps
                    nroOrden: nroSrch,
                    anoParlamentario: anoSrch
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";

                    var tableHead = ' <table class="table table-dark table-bordered table-hover"><thead><tr><th>Nro de Exp.</th><th>Sumario</th><th>Tipo Sanción</th><th>Tipo Proyecto</th></tr></thead><tbody>';
                    var tableFooter = '</tbody></table>';
                    if ($(doc).find('sancion').size() > 0) {
                        $(doc).find('ArrayOfSancion').each(function () {
                            $(doc).find('sancion').each(function () {

                                var id_expediente = $(this).find('id_expediente').text();
                                var nro_de_expediente = $(this).find('nro_de_expediente').text();
                                var sumario = $(this).find('sumario').text();
                                var sanciontipo = $(this).find('sanciontipo').text();
                                var proyectotipo = $(this).find('proyectotipo').text();

                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {
                                    var urlDoc = "<a title='Descargar Sancion' class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                    if (urlDoc == '') {
                                        urlDoc = 'SIN DOCUMENTO'
                                    }
                                }
                                htmlString = htmlString + "	<tr><td><a title='Abrir Expediente " + nro_de_expediente + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_de_expediente + " </a></td><td> " + sumario + "</td><td> " + sanciontipo + "	</td><td> " + proyectotipo + "</td></tr> ";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_S' + nroSrch + '-' + anoSrch + '').html(tableHead + htmlString + tableFooter);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroSrch + '-' + anoSrch + '"><a class="nav-link " href="#new_tab_S' + nroSrch + '-' + anoSrch + '" data-toggle="tab">Resolucion o Declaracion ' + nroSrch + '-' + anoSrch + ' <i id="' + nroSrch + '-' + anoSrch + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_S" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_S' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                    removeLoaderOverlay();

                }
            });
        }
        
        return false;
    });
    $('#ley-exacto').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#find-sancion").trigger('click');

            return false;
        }
    })
    $("#find-sancion").click(function () {

        var nroLey = $('#nroLey').val();

        if ((nroLey == '')) {
            jqueryGritter("Atención", "Debe Completar el Campo", "warning", "");
        } else {
            initLoaderOverlay();
            $('#resExactosContent div.active').removeClass('active').removeClass('in');
            $('#resExactos li.active').removeClass('active');

            $('#resExactosContent').append('<div class="tab-pane in active" id="new_tab_L' + nroLey + '"><p> Buscando <img src="../assets/images/logo_anim_lcaba2.gif" alt="Buscando" /> ...</p></div>');

            $.ajax({
                url: '../webservices/Json.asmx/GetSancionNroDeLey',
                dataType: 'XML',
                //contentType: "application/xml; charset=utf-8",
                type: 'POST',
                data: {
                    // our hypothetical feed requires UNIX timestamps
                    NroDeLey: nroLey
                },
                error: function (doc) {
                    $('#resExactosContent').html(doc);
                    removeLoaderOverlay();
                },
                success: function (doc) {
                    var htmlString = "";

                    var tableHead = ' <table class="table table-dark table-bordered table-hover"><thead><tr><th>Nro de Exp.</th><th>Sumario</th><th>Tipo Sanción</th><th>Tipo Proyecto</th></tr></thead><tbody>';
                    var tableFooter = '</tbody></table>';
                    if ($(doc).find('sancion').size() > 0) {
                        $(doc).find('ArrayOfSancion').each(function () {
                            $(doc).find('sancion').each(function () {

                                var id_expediente = $(this).find('id_expediente').text();
                                var nro_de_expediente = $(this).find('nro_de_expediente').text();
                                var sumario = $(this).find('sumario').text();
                                var sanciontipo = $(this).find('sanciontipo').text();
                                var proyectotipo = $(this).find('proyectotipo').text();

                                var urlDoc = "";
                                if ($(this).find('urlDoc').text() > 0) {
                                    var urlDoc = "<a class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                                    if (urlDoc == '') {
                                        urlDoc = 'SIN DOCUMENTO'
                                    }
                                }
                                htmlString = htmlString + "	<tr><td> <a title='Abrir Expediente " + nro_de_expediente + "' href='expediente.aspx?id=" + id_expediente + "' rel='iframe[pf]' >" + nro_de_expediente + "</a> </td><td> " + sumario + "</td><td> " + sanciontipo + "	</td><td> " + proyectotipo + "</td></tr> ";
                            });
                        });
                    } else {
                        htmlString = "<div class='alert alert-warning'><b>No Existen Datos</b></div>";
                    }
                    $('#new_tab_L' + nroLey + '').html(tableHead + htmlString + tableFooter);
                    $('#resExactos').append('<li class="nav-item" id="#li_tab_"' + nroLey + '"><a class="nav-link " href="#new_tab_L' + nroLey + '" data-toggle="tab">Ley ' + nroLey + ' <i id="' + nroLey + '" class="remove-tab  fa fa-times"></i></a></li>');
                    $('#resExactos a:last').tab('show');
                    $(".remove-tab").click(function () {
                        $("#li_tab_" + $(this).attr('id')).remove();
                        $("#new_tab_L" + $(this).attr('id')).remove();
                        $(this).parent().remove();
                        nextTab('resExactos');
                        return false;
                    });

                    if (isMobile) {
                        $([document.documentElement, document.body]).animate({
                            //scrollTop: $('#new_tab_L' + nroSrch + '-' + anoSrch).offset().top
                            scrollTop: $('#resExactosContent').offset().top
                        }, 2000);
                    }
                      removeLoaderOverlay();

                }
            });
        }
       
        return false;
    });

    $('#expediente-avanzado').keydown(function (e) {
        if (e.keyCode == 13) {
            $("#advanced-search").trigger('click');

            return false;
        }

    })

    $("#advanced-search").click(function () {

        var IdProyectoTipo = '';
        var IdUbicacion = '';
        var IdAutoresInternos = '';
        var IdEstado = '';

        var FechaDesde = $('#txbFechaDesde').val();
        var FechaHasta = $('#txbFechaHasta').val();

        var AnioParlamentario = $('#avanzada_ano_parlamentario').val();

        $('#sel-tipo-proyecto li').each(function () {
            IdProyectoTipo = IdProyectoTipo + $(this).data("id") + ',';
        });

        $('#sel-ubicacion li').each(function () {
            IdUbicacion = IdUbicacion + $(this).data("id") + ',';
        });

        $('#sel-estado li').each(function () {
            IdEstado = IdEstado + $(this).data("id") + ',';
        });

        $('#sel-autores-int li').each(function () {
            //if ($(this).is(':checked')) {
            IdAutoresInternos = IdAutoresInternos + $(this).data("id") + ',';
            //}
        });

        var Sumario = '';
        var SumarioExacto = 0;

        if ($('#txtSumario').val() != '') {
            Sumario = $('#txtSumario').val();

            if ($("#chkSumExacta").is(':checked')) {
                SumarioExacto = 1;
            }
        }
        if ($("#data-expedientes").dataTable() != undefined) {
            $("#data-expedientes").dataTable().fnClearTable();
        };
        //$("#data-expedientes").dataTable().fnClearTable();
        if ($("#data-expedientes").length > 0) {
            $("#data-expedientes").dataTable().fnDestroy();
			$.fn.dataTable.moment('DD/MM/YYYY HH:mm:ss');
            // dostuff
            var thisTable = $("#data-expedientes").dataTable({
                "oLanguage": {
                    "sUrl": "../assets/js/dataTables.spanish.txt"
                },
                dom: '<"html5buttons"B>lTfgitp',
                buttons: [{
                    extend: 'copy'
                },
                    {
                        extend: 'csv'
                    },
                    {
                        extend: 'excel',
                        title: 'Listado Expedientes LCABA '
                    },
                    /*{ extend: 'pdf', title: 'Listado Presentes LCABA'  },*/

                    {
                        extend: 'print',
                        customize: function (win) {
                            $(win.document.body).addClass('white-bg');
                            $(win.document.body).css('font-size', '10px');

                            $(win.document.body).find('table')
                                .addClass('compact')
                                .css('font-size', 'inherit');
                        }
                    },

                    {
                        extend: 'pdfHtml5',
                        orientation: 'landscape',
                        pageSize: 'LEGAL',
                        text: '<u>E</u>xportar Tabla a (PDF)',
                        key: {
                            key: 'e',
                            altKey: false
                        },

                        customize: function (doc) {
                            doc.content.splice(0, 1, {
                                margin: [0, 0, 0, 24],
                                fit: [100, 100],
                                image: imageLOGO
                            });
                            doc.content.splice(1, 0, {
                                margin: [0, 0, 0, 12],
                                alignment: 'left',
                                text: 'Informe Expedientes  LCABA ',
                                fontSize: 12
                            });
                        },
                        download: 'download',
                        exportOptions: {
                            /*modifier: {
                                    page: 'current'
                                },
                                columns: [0, 1, 2]

                                */
                        }
                    }
                ],
                "bDestroy": true,
                "bRetrieve": true,
                "bDeferRender": true,
                "fnDrawCallback": function () {
                    
                },
                columnDefs: [
                    { targets: [3], className: "text-smaller" }
                ] 
				,
				"aaSorting": [[ 1, "desc" ]]
				
            });
            //thisTable.fnDestroy();
            //thisTable.fnClearTable();

        }


        var globalSource = '../webservices/Json.asmx/GetExpedienteAvanzada';

        initLoaderOverlay();

        $.ajax({
            dataType: 'xml',
            type: 'post',
            cache: false,
            "url": globalSource,
            data: {
                IdProyectoTipo: IdProyectoTipo.slice(0, -1),
                IdAutoresInternos: IdAutoresInternos.slice(0, -1),
                IdUbicacion: IdUbicacion.slice(0, -1),
                IdEstado: IdEstado.slice(0, -1),
                Sumario: Sumario,
                SumarioExacto: SumarioExacto,
                FechaDesde: FechaDesde,
                FechaHasta: FechaHasta,
                AnioParlamentario: AnioParlamentario,
                Limite: ''
            },
            success: function (response) {
				$.fn.dataTable.moment('DD/MM/YYYY HH:mm:ss');
                var $events = $(response).find("expedienteAvanzado");
				
                $events.each(function (index, event) {
                    var $event = $(event),
                        addData = [];
                    var urlDoc = "";
                    if ($(this).find('urlDoc').text() > 0) {
                        var urlDoc = "<a class='' target='_blank' href='download.aspx?IdDoc=" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";
                    }

                    var autor_des = $(this).find('autor_des').text();
                    var coautores_des = $(this).find('coautores_des').text().split(';');

                    var autor_id = $(this).find('autor_id').text();
                    var coautores_id = $(this).find('coautores_id').text().split(',');


                    var leg_coautor = '';
                    $.each(coautores_des, function (index, value) {

                        if (value != '') {
                            leg_coautor = leg_coautor + " [<a href='legislador.aspx?id=" + coautores_id[index].replace(/ /g, '') + "' rel='iframe[legislador]' >" + value + "</a>]<br/>";
                        }

                    });
					date1 = $event.children("fch_inicio").text().split(" ");
					
					//console.log(date1[0].replace(/\b\d\b/g, '0$&') + ' hours ' +date1[1]);
					var dateInicio = date1[0].replace(/\b\d\b/g, '0$&') + ' ' +date1[1];
                    addData.push("<a title='Abrir Expediente " + $event.children("nro_de_expediente").text() + "' href='expediente.aspx?id=" + $event.children("id_expediente").text() + "' rel='iframe[pf]' >" + $event.children("nro_de_expediente").text() + '</a><br/>' + urlDoc);
                   // addData.push($event.children("fch_inicio").text());
                    addData.push(dateInicio);
                    //if (!isMobile) addData.push("<a href='legislador.aspx?id=" + autor_id.replace(/ /g, '') + "' rel='iframe[legislador]' >" + autor_des + "</a>");
                    //if (!isMobile) addData.push(leg_coautor);
                    addData.push("<a href='legislador.aspx?id=" + autor_id.replace(/ /g, '') + "' rel='iframe[legislador]' >" + autor_des + "</a>");
                    addData.push(leg_coautor);                    
                    addData.push('<small>'+$event.children("sumario").text()+'</small>');
                    addData.push($event.children("tipo_proyecto_des").text());
                    addData.push($event.children("fch_movimiento").text());
                    addData.push($event.children("ubicacion_des").text());
                    addData.push($event.children("descripcion").text());
                    //if (!isMobile) addData.push($event.children("sumario").text());
                    
                    //if (!isMobile) addData.push(($event.children("TieneSancion").text() == 1 ? "<a title='Ver sanción' href='expediente.aspx?id=" + $event.children("id_expediente").text() + "&tab=sancion' rel='iframe[pf]' >Sancionado</a>" : "Sin Sancionar"));
                    addData.push(($event.children("TieneSancion").text() == 1 ? "<a title='Ver sanción' href='expediente.aspx?id=" + $event.children("id_expediente").text() + "&tab=sancion' rel='iframe[pf]' >Si</a>" : "No"));

                    thisTable.fnAddData(addData);
                });
                //thisTable.fnDestroy();
                /*thisTable.fnSort([
                    [1, 'desc']
                ]);
				*/
                if (isMobile) {

                    $([document.documentElement, document.body]).animate({
                        scrollTop: $('#data-expedientes').offset().top
                    }, 2000);
                }
                removeLoaderOverlay();
            },
            error: function (doc) {
                $('#data-expedientes tbody').html(doc);
                removeLoaderOverlay();
            }
        });

        return false;
    });


    $('#despacho-avanzado').keydown(function (e) {
        if (e.keyCode == 13) {
            //alert('enter');
            $("#advanced-search-despacho").trigger('click');

            return false;
        }

    })

    $("#advanced-search-despacho").click(function () {

        //$("#data-expedientes tbody > tr").remove();

        var IdProyectoTipo = '';

        var FechaDesde = $('#txbFechaDespachoDesde').val();
        var FechaHasta = $('#txbFechaDespachoHasta').val();

        $('#sel-tipo-despacho li').each(function () {
            IdProyectoTipo = IdProyectoTipo + $(this).data("id") + ',';
            //alert(IdProyectoTipo);
        });

        var Sumario = '';
        var SumarioExacto = 0;

        if ($('#txtSumarioDespacho').val() != '') {
            Sumario = $('#txtSumarioDespacho').val();

            if ($("#chkSumExactoDespacho").is(':checked')) {
                SumarioExacto = 1;
            }
        }

        var Preferencia = 0;
        if ($("#chckPreferencia").is(':checked')) {
            Preferencia = 1;
        }

        var preferenciaIndistinto = 0;
        if ($("#preferenciaIndistinto").is(':checked')) {
            preferenciaIndistinto = 1;
        }

        if ((FechaDesde == '') && (FechaHasta == '') && (Sumario == '') && (IdProyectoTipo == '')) {
            jqueryGritter("Atención", "Debe completar algunos de los campos dispuestos para la busqueda", "warning", "");
        } else {

            if ($("#data-despachos").dataTable() != undefined) {
                $("#data-despachos").dataTable().fnClearTable();
            };
            //$("#data-expedientes").dataTable().fnClearTable();
            if ($("#data-despachos").length > 0) {
                $("#data-despachos").dataTable().fnDestroy();

                // dostuff
                var thisTable = $("#data-despachos").dataTable({
                    "oLanguage": {
                        "sUrl": "../assets/js/dataTables.spanish.txt"
                    },
                    dom: '<"html5buttons"B>lTfgitp',
                    buttons: [{
                        extend: 'copy'
                    },
                        {
                            extend: 'csv'
                        },
                        {
                            extend: 'excel',
                            title: 'Listado Despachos LCABA '
                        },
                        /*{ extend: 'pdf', title: 'Listado Presentes LCABA'  },*/

                        {
                            extend: 'print',
                            customize: function (win) {
                                $(win.document.body).addClass('white-bg');
                                $(win.document.body).css('font-size', '10px');

                                $(win.document.body).find('table')
                                    .addClass('compact')
                                    .css('font-size', 'inherit');
                            }
                        },

                        {
                            extend: 'pdfHtml5',
                            orientation: 'landscape',
                            pageSize: 'LEGAL',
                            text: '<u>E</u>xportar Tabla a (PDF)',
                            key: {
                                key: 'e',
                                altKey: false
                            },

                            customize: function (doc) {
                                doc.content.splice(0, 1, {
                                    margin: [0, 0, 0, 24],
                                    fit: [100, 100],
                                    image: imageLOGO
                                });
                                doc.content.splice(1, 0, {
                                    margin: [0, 0, 0, 12],
                                    alignment: 'left',
                                    text: 'Informe Despachos ',
                                    fontSize: 12
                                });
                            },
                            download: 'open',
                            exportOptions: {
                                /*modifier: {
                                    page: 'current'
                                },
                                columns: [0, 1, 2]

                                */
                            }
                        }
                    ],
                    "bDestroy": true,
                    "bRetrieve": true,
                    "bDeferRender": true,
                    "fnDrawCallback": function () {
                       
                    }
                });
                //thisTable.fnDestroy();
                //thisTable.fnClearTable();

            }


            var globalSource = '../webservices/Json.asmx/GetDespachoAvanzado';

            initLoaderOverlay();

            $.ajax({
                dataType: 'xml',
                type: 'post',
                cache: false,
                "url": globalSource,
                data: {
                    IdProyectoTipo: IdProyectoTipo.slice(0, -1),
                    Sumario: Sumario,
                    SumarioExacto: SumarioExacto,
                    FechaDesde: FechaDesde,
                    FechaHasta: FechaHasta,
                    Preferencia: Preferencia,
                    preferenciaIndistinto: preferenciaIndistinto
                },
                success: function (response) {

                    var $events = $(response).find("despachoAvanzado");

                    $events.each(function (index, event) {
                        var $event = $(event),
                            addData = [];

                        addData.push("<a title='Abrir Expediente para el Despacho " + $event.children("nro_despacho").text() + "' href='expediente.aspx?id=" + $event.children("id_expediente").text() + "' rel='iframe[pf]' >" + $event.children("nro_despacho").text() + '</a>');
                        addData.push($event.children("sumario").text());
                        addData.push($event.children("fch_publicacion").text());
                        addData.push($event.children("fch_vencimiento_observaciones").text());
                        addData.push($event.children("tipo_proyecto_des").text());
                        addData.push($event.children("es_preferencia").text());

                        thisTable.fnAddData(addData);
                    });
                    //thisTable.fnDestroy();
                    $('#data-despachos').show();

                    if (isMobile) {

                        $([document.documentElement, document.body]).animate({
                            scrollTop: $('#data-despachos').offset().top
                        }, 2000);
                    }

                    removeLoaderOverlay(); 
                },
                error: function (doc) {
                    $('#data-despachos tbody').html(doc);
                    removeLoaderOverlay();
                }
            });
        }

        return false;
    });


    $('#sesiones-avanzado').keydown(function (e) {
        if (e.keyCode == 13) {
            //alert('enter');
            $("#advanced-search-sesiones").trigger('click');

            return false;
        }

    })

    $("#advanced-search-sesiones").click(function () {

        //ExtraInfo = (typeof ExtraInfo === 'undefined') ? 'Informe ' + FechaSesion : ExtraInfo;

        var FechaDesde = $('#txtFechaSesionDesde').val();
        var FechaHasta = $('#txtFechaSesionHasta').val();

        if ((FechaDesde == '') || (FechaHasta == '')) {
            jqueryGritter("Atención", "Debe Completar Ambos Campos", "warning", "");
        } else {

            if ($("#data-sesiones").dataTable() != undefined) {
                $("#data-sesiones").dataTable().fnClearTable();
            };
            //$("#data-expedientes").dataTable().fnClearTable();
            if ($("#data-sesiones").length > 0) {
                $("#data-sesiones").dataTable().fnDestroy();

                // dostuff
                var thisTable = $("#data-sesiones").dataTable({
                    "oLanguage": {
                        "sUrl": "../assets/js/dataTables.spanish.txt"
                    },
                    dom: '<"html5buttons"B>lTfgitp',
                    buttons: [{
                        extend: 'copy'
                    },
                        {
                            extend: 'csv'
                        },
                        {
                            extend: 'excel',
                            title: 'Listado Sesiones LCABA '
                        },
                        /*{ extend: 'pdf', title: 'Listado Presentes LCABA'  },*/

                        {
                            extend: 'print',
                            customize: function (win) {
                                $(win.document.body).addClass('white-bg');
                                $(win.document.body).css('font-size', '10px');

                                $(win.document.body).find('table')
                                    .addClass('compact')
                                    .css('font-size', 'inherit');
                            }
                        },

                        {
                            extend: 'pdfHtml5',
                            orientation: 'portrait',
                            pageSize: 'LEGAL',
                            text: '<u>E</u>xportar Tabla a (PDF)',
                            key: {
                                key: 'e',
                                altKey: false
                            },

                            customize: function (doc) {
                                doc.content.splice(0, 1, {
                                    margin: [0, 0, 0, 24],
                                    fit: [100, 100],
                                    image: imageLOGO
                                });
                                doc.content.splice(1, 0, {
                                    margin: [0, 0, 0, 12],
                                    alignment: 'left',
                                    text: 'Informe Sesiòn ',
                                    fontSize: 12
                                });
                            },
                            download: 'open',
                            exportOptions: {
                                /*modifier: {
                                        page: 'current'
                    },
                                    columns: [0, 1, 2]

                                    */
                            }
                        }
                    ],
                    "bDestroy": true,
                    "bRetrieve": true,
                    "bDeferRender": true,
                    "fnDrawCallback": function () {
                        
                        $(".getPresentesRecinto").click(function (event) {
                            var idSesion = $(this).attr('dateS');
 
                        });
                    }
                });
                //thisTable.fnDestroy();
                //thisTable.fnClearTable();

            }


            var globalSource = '../webservices/Json.asmx/GetSesionesAvanzado';

            initLoaderOverlay();

            $.ajax({
                dataType: 'xml',
                type: 'post',
                cache: false,
                "url": globalSource,
                data: {
                    FechaDesde: FechaDesde,
                    FechaHasta: FechaHasta
                },
                success: function (response) {

                    var $events = $(response).find("sesiones");

                    $events.each(function (index, event) {
                        var $event = $(event),
                            addData = [];


                        var LaborDoc = '';
                        if ($event.children("labor_documento").text() != 0) LaborDoc = '<a title="Descargar documento de Labor para la Sesion del día ' + $event.children("fch_sesion_lp").text() + ' " href="download.aspx?IdDoc=' + $event.children("labor_documento").text() + '" target="_blank" class="  ">Descargar <i class="fa fa-cloud-download"></i></a>';

                        var PreLaborDoc = '';
                        if ($event.children("prelabor_documento").text() != 0) PreLaborDoc = '<a title="Descargar documento de PreLabor para la Sesion del día ' + $event.children("fch_sesion_lp").text() + ' " href="download.aspx?IdDoc=' + $event.children("prelabor_documento").text() + '" target="_blank" class="  ">Descargar <i class="fa fa-cloud-download"></i></a>';

                        var VtDoc = '';
                        if ($event.children("archivo_vt").text() != 0) VtDoc = '<a title="Descargar documento de VT para la Sesion del día ' + $event.children("fch_sesion_lp").text() + ' "  href="download.aspx?IdDoc=' + $event.children("archivo_vt").text() + '" target="_blank" class=" ">Descargar <i class="fa fa-cloud-download"></i></a>';

                        var ACDoc = '';
                        if ($event.children("asuntos_considerados_documento").text() != 0) ACDoc = '<a title="Descargar documento de Asuntos Considerados para la Sesion del día ' + $event.children("fch_sesion_lp").text() + ' " href="download.aspx?IdDoc=' + $event.children("asuntos_considerados_documento").text() + '" target="_blank" class=" ">Descargar <i class="fa fa-cloud-download"></i></a>';


                        var btnAC = "<a title='Ver Asuntos Considerados para la Sesion del día " + $event.children("fch_sesion_lp").text() + " ' href='#inline_content_ac' data-toggle='modal' onclick='GetAsuntosConsiderados(" + $event.children("id_sesion_lp").text() + ")' >Ver Asuntos</a>";
                        var btnSanciones = "<a title='Ver Sanciones para la Sesion del día " + $event.children("fch_sesion_lp").text() + " ' href='#inline_content_sanciones' data-toggle='modal' onclick='getSancionesByIdSesion(" + $event.children("id_sesion_lp").text() + ")'> Sanciones</a>";
                        //var btnPresentes = "<a class='' href='#inline_content_presentes' data-toggle='modal' onclick='getSesionPresentes(" + $event.children("fch_sesion_lp").text() + ")'>Presentes</a>";
                        //var btnPresentes = '<a  href="javascript:;"  class=" " onclick="window.open(\'' + WEBSITE + 'InfoSesion/' + $event.children("id_sesion_lp").text() + '\', \'_blank\').focus();" >Información Completa</a>';
                        var btnPresentes = '<a  href="sesion_votaciones.aspx?IdSesion=' + $event.children("id_sesion_lp").text() + '"  class=" "  >Ver ' + $event.children("fch_sesion_lp").text() + '</a>';
                        

                        var infoSesion = 'Realizada';
                        //if ($event.children("ve_idsesion").text() == '') infoSesion = 'NO Realizada';
                        if ($event.children("labor_documento").text() == 0) infoSesion = 'NO Realizada';
                        //+ ' -  ' + btnPresentes
                        addData.push(btnPresentes);
                        addData.push(LaborDoc);
                        addData.push(PreLaborDoc);
                        addData.push(VtDoc);
                        addData.push(ACDoc);
                        addData.push(infoSesion ); //' + btnAC + ' - //+ ' - ' + btnSanciones + '  ' + $event.children("ve_idsesion").text());
                        thisTable.fnAddData(addData);
                    });
                    //thisTable.fnDestroy();
                    $(".getPresentesRecinto").click(function (event) {
                        var idSesion = $(this).attr('dateS');

                        window.open(WEBSITE + 'InfoSesion/' + idSesion, '_blank').focus();
                    });

                    $('#data-sesiones').show();
                    if (isMobile) {

                        $([document.documentElement, document.body]).animate({
                            scrollTop: $('#data-sesiones').offset().top
                        }, 2000);
                    }
                    removeLoaderOverlay();

                },
                error: function (doc) {
                    $('#data-sesiones tbody').html(doc);
                    removeLoaderOverlay();
                }
            });
        }

        return false;
    });

    $('#antecedentes-avanzado').keydown(function (e) {
        if (e.keyCode == 13) {
            //alert('enter');
            $("#advanced-search-antecedentes").trigger('click');

            return false;
        }

    })

    $("#advanced-search-antecedentes").click(function () {

        var Nota = '';
        var NotaExacta = 0;

        if ($('#txtNota').val() == '') {
            jqueryGritter("Atención", "Debe Completar el Campo", "warning", "");
        } else {

            if ($('#txtNota').val() != '') {
                Nota = $('#txtNota').val();

                if ($("#chkNotaExacta").is(':checked')) {
                    NotaExacta = 1;
                }
            }
            if ($("#data-antecedentes").dataTable() != undefined) {
                $("#data-antecedentes").dataTable().fnClearTable();
            };
            //$("#data-expedientes").dataTable().fnClearTable();
            if ($("#data-antecedentes").length > 0) {
                $("#data-antecedentes").dataTable().fnDestroy();

                // dostuff
                var thisTable = $("#data-antecedentes").dataTable({
                    "oLanguage": {
                        "sUrl": "../assets/js/dataTables.spanish.txt"
                    },
                    dom: '<"html5buttons"B>lTfgitp',
                    buttons: [{
                        extend: 'copy'
                    },
                        {
                            extend: 'csv'
                        },
                        {
                            extend: 'excel',
                            title: 'Listado Presentes LCABA '
                        },
                        /*{ extend: 'pdf', title: 'Listado Presentes LCABA'  },*/

                        {
                            extend: 'print',
                            customize: function (win) {
                                $(win.document.body).addClass('white-bg');
                                $(win.document.body).css('font-size', '10px');

                                $(win.document.body).find('table')
                                    .addClass('compact')
                                    .css('font-size', 'inherit');
                            }
                        },

                        {
                            extend: 'pdfHtml5',
                            orientation: 'portrait',
                            pageSize: 'LEGAL',
                            text: '<u>E</u>xportar Tabla a (PDF)',
                            key: {
                                key: 'e',
                                altKey: false
                            },

                            customize: function (doc) {
                                doc.content.splice(0, 1, {
                                    margin: [0, 0, 0, 24],
                                    fit: [100, 100],
                                    image: imageLOGO
                                });
                                doc.content.splice(1, 0, {
                                    margin: [0, 0, 0, 12],
                                    alignment: 'left',
                                    text: 'Informe Sesiòn ',
                                    fontSize: 12
                                });
                            },
                            download: 'open',
                            exportOptions: {
                                /*modifier: {
                                         page: 'current'
                                     },
                                     columns: [0, 1, 2]
 
                                     */
                            }
                        }
                    ],
                    "bDestroy": true,
                    "bRetrieve": true,
                    "bDeferRender": true,
                    "fnDrawCallback": function () {
                       
                    }
                });
                //thisTable.fnDestroy();
                //thisTable.fnClearTable();

            }


            var globalSource = '../webservices/Json.asmx/GetExpedienteByNotaAntecedente';

            initLoaderOverlay();

            $.ajax({
                dataType: 'xml',
                type: 'post',
                cache: false,
                "url": globalSource,
                data: {
                    Nota: Nota,
                    NotaExacta: NotaExacta
                },
                success: function (response) {

                    var $events = $(response).find("expedienteAvanzado");

                    $events.each(function (index, event) {
                        var $event = $(event),
                            addData = [];
                        var urlDoc = "";
                        //var urlDoc = "<a class='' target='_blank' href='" + $(this).find('urlDoc').text() + "'>Descargar <i class='fa fa-cloud-download'></i></a>";

                        addData.push("<a title='Abrir Expediente " + $event.children("nro_de_expediente").text() + "' href='expediente.aspx?id=" + $event.children("id_expediente").text() + "' rel='iframe[pf]' >" + $event.children("nro_de_expediente").text() + '</a>' + urlDoc);
                        addData.push($event.children("fch_inicio").text());
                        addData.push($event.children("autor_des").text());
                        addData.push($event.children("coautores_des").text());
                        addData.push($event.children("fch_movimiento").text());
                        addData.push($event.children("ubicacion_des").text());
                        addData.push($event.children("descripcion").text());
                        addData.push($event.children("sumario").text());

                        thisTable.fnAddData(addData);
                    });
                    //thisTable.fnDestroy();
                     
                    if (isMobile) {

                        $([document.documentElement, document.body]).animate({
                            scrollTop: $('#data-antecedentes').offset().top
                        }, 2000);
                    }
                    removeLoaderOverlay();
                },
                error: function (doc) {
                    $('#data-antecedentes tbody').html(doc);
                    removeLoaderOverlay();
                }
            });

        } 
        return false;
    });
    var oTable1 = $('#table_report').dataTable({
        "aoColumns": [{
            "bSortable": false
        },
            null, null, null, null, null,
            {
                "bSortable": false
            }
        ]
    });


    $('table th input:checkbox').on('click', function () {
        var that = this;
        $(this).closest('table').find('tr > td:first-child input:checkbox')
            .each(function () {
                this.checked = that.checked;
                $(this).closest('tr').toggleClass('selected');
            });

    });

    $('[data-rel=tooltip]').tooltip();
})

$(function () {


    // scrollables
    $('.slim-scroll').each(function () {
        var $this = $(this);
        $this.slimScroll({
            height: $this.data('height') || 100,
            railVisible: true
        });
    });


    /*
    $( '.row-fluid' ).sortable({
    connectWith: '.row-fluid'
    });
    $( ".widget-box" ).addClass( "ui-widget ui-widget-content ui-helper-clearfix ui-corner-all" )
    .find( ".widget-header" )
    .addClass( "ui-widget-header ui-corner-all" )
    .prepend( "<span class='ui-icon ui-fa fa-minusthick'></span>")
    .end()
    .find( ".widget-body" );
    $( ".portlet-header .ui-icon" ).click(function() {
    $( this ).toggleClass( "ui-fa fa-minusthick" ).toggleClass( "ui-fa fa-plusthick" );
    $( this ).parents( ".portlet:first" ).find( ".portlet-content" ).toggle();
    });
    $( '.row-fluid' ).disableSelection();
    */


    $('.dialogs,.comments').slimScroll({
        height: '300px'
    });

    $('#tasks').sortable();
    $('#tasks').disableSelection();
    $('#tasks input:checkbox').removeAttr('checked').on('click', function () {
        if (this.checked) $(this).closest('li').addClass('selected');
        else $(this).closest('li').removeClass('selected');
    });

    //var oldie = $.browser.msie && $.browser.version < 9;
    $('.easy-pie-chart.percentage').each(function () {
        var $box = $(this).closest('.infobox');
        var barColor = $(this).data('color') || (!$box.hasClass('infobox-dark') ? $box.css('color') : 'rgba(255,255,255,0.95)');
        var trackColor = barColor == 'rgba(255,255,255,0.95)' ? 'rgba(255,255,255,0.25)' : '#E2E2E2';
        var size = parseInt($(this).data('size')) || 50;
        $(this).easyPieChart({
            barColor: barColor,
            trackColor: trackColor,
            scaleColor: false,
            lineCap: 'butt',
            lineWidth: parseInt(size / 10),
            animate: oldie ? false : 1000,
            size: size
        });
    });

    $('.sparkline').each(function () {
        var $box = $(this).closest('.infobox');
        var barColor = !$box.hasClass('infobox-dark') ? $box.css('color') : '#FFF';
        $(this).sparkline('html', {
            tagValuesAttribute: 'data-values',
            type: 'bar',
            barColor: barColor,
            chartRangeMin: $(this).data('min') || 0
        });
    });


    var d1 = [];
    for (var i = 0; i < Math.PI * 2; i += 0.5) {
        d1.push([i, Math.sin(i)]);
    }

    var d2 = [];
    for (var i = 0; i < Math.PI * 2; i += 0.5) {
        d2.push([i, Math.cos(i)]);
    }

    var d3 = [];
    for (var i = 0; i < Math.PI * 2; i += 0.2) {
        d3.push([i, Math.tan(i)]);
    }
    /*               				

	var sales_charts = $('#sales-charts').css({'width':'100%' , 'height':'220px'});
    $.plot("#sales-charts", [
    { label: "Domains", data: d1 },
    { label: "Hosting", data: d2 },
    { label: "Services", data: d3 }
    ], {
    hoverable: true,
    shadowSize: 0,
    series: {
    lines: { show: true },
    points: { show: true }
    },
    xaxis: {
    tickLength: 0
    },
    yaxis: {
    ticks: 10,
    min: -2,
    max: 2,
    tickDecimals: 3
    },
    grid: {
    backgroundColor: { colors: [ "#fff", "#fff" ] },
    borderWidth: 1,
    borderColor:'#555'
    }
    });

    */
    //$('*').tooltip();
    $('#recent-box [data-rel="tooltip"]').tooltip({
        placement: tooltip_placement
    });

})


if ($.fn.dataTableExt !== undefined) { 
	 jQuery.extend(jQuery.fn.dataTableExt.oSort, {
		"extract-date-pre": function(value) {
			//console.log(value);
			var date = value;//$(value, 'span')[0].innerHTML;				
			date = date.split('/');
			return Date.parse(date[1] + '/' + date[0] + '/' + date[2])
		},
		"extract-date-asc": function(a, b) {
			return ((a < b) ? -1 : ((a > b) ? 1 : 0));
		},
		"extract-date-desc": function(a, b) {
			return ((a < b) ? 1 : ((a > b) ? -1 : 0));
		}
	});
}