const { response, request } = require('express');
const mysql = require ('mysql');
const config = require('../helpers/config')

const connection = mysql.createConnection(config);
connection.connect(error => {
    if (error) throw error;
    console.log('Conected gerente'); 
});


module.exports.obtenerHumedad = (req, res) => {
  const idMina = req.query.idMina;
  const fecha = req.query.fecha.replace(/'/g, '');

  const consulta = `SELECT humedad FROM reporte WHERE idMina = ${idMina} AND fecha = '${fecha}' LIMIT 1`;

  connection.query(consulta, (error, results) => {
    if (error) {
      console.error('Error en la consulta:', error);
      res.status(500).json({ error: 'Ocurrió un error en la consulta' });
    } else {
      if (results.length > 0) {
        const humedad = results[0].humedad;
        res.json({ humedad });
      } else {
        res.status(404).json({ error: 'No se encontró la humedad para la fecha y mina especificadas' });
      }
    }
  });
};


module.exports.reporteBascula = (req, res) => {
  const fecha = req.query.fecha.replace(/'/g, '');
  const nombreMina = req.query.nombreMina.replace(/'/g, '');

  const consulta1 = `SELECT 
    SUM(acarreo - (trituradasP1 + trituradasP2)) AS inicial,
    SUM(trituradasP1 + trituradasP2) AS molidasAcum
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE DATE_SUB('${fecha}', INTERVAL 1 DAY) >= fecha
    AND m.nombre = '${nombreMina}'
    AND MONTH(mv.fecha) = MONTH('${fecha}')
    AND YEAR(mv.fecha) = YEAR('${fecha}')`;

  const consulta2 = `SELECT 
    SUM(acarreo) AS mensual
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE m.nombre = '${nombreMina}'
    AND MONTH(fecha) = MONTH('${fecha}')
    AND YEAR(fecha) = YEAR('${fecha}')`;

  const consulta3 = `SELECT 
    SUM(acarreo) AS acarreoHoy,
    SUM(trituradasP1 + trituradasP2) AS trituradasHoy
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE m.nombre = '${nombreMina}'
    AND fecha = '${fecha}'`;

  const consulta4 = `SELECT 
    SUM(acarreo - (trituradasP1 + trituradasP2)) AS inicial2
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE DATE_SUB('${fecha}', INTERVAL 1 DAY) >= fecha
    AND m.nombre = '${nombreMina}'
    AND MONTH(mv.fecha) = MONTH('${fecha}')
    AND YEAR(mv.fecha) = YEAR('${fecha}')`;

  const consulta5 = `SELECT 
    SUM(acarreo) AS acarreoALaFecha,
    SUM(trituradasP1 + trituradasP2) AS molidasALaFecha
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE m.nombre = '${nombreMina}'
    AND '${fecha}' >= mv.fecha
    AND MONTH(mv.fecha) = MONTH('${fecha}')
    AND YEAR(mv.fecha) = YEAR('${fecha}')`;

  const consulta6 = `SELECT 
    acarreo,
    (trituradasP1 + trituradasP2) AS trituradas
    FROM movimiento_mineral mv
    JOIN mina m ON m.idMina = mv.idMina
    WHERE m.nombre = '${nombreMina}'
    AND fecha = '${fecha}'`;

  const resultado = {};

  connection.query(consulta1, (error, results1) => {
    if (error) {
      console.error('Error en la consulta 1:', error);
      resultado.inicial = { error: 'Ocurrió un error en la consulta 1' };
    } else {
      resultado.inicial = results1[0];
    }

    connection.query(consulta2, (error, results2) => {
      if (error) {
        console.error('Error en la consulta 2:', error);
        resultado.mensual = { error: 'Ocurrió un error en la consulta 2' };
      } else {
        resultado.mensual = results2[0];
      }

      connection.query(consulta3, (error, results3) => {
        if (error) {
          console.error('Error en la consulta 3:', error);
          resultado.hoy = { error: 'Ocurrió un error en la consulta 3' };
        } else {
          resultado.hoy = results3[0];
        }

        connection.query(consulta4, (error, results4) => {
          if (error) {
            console.error('Error en la consulta 4:', error);
            resultado.inicial2 = { error: 'Ocurrió un error en la consulta 4' };
          } else {
            resultado.inicial2 = results4[0];
          }

          connection.query(consulta5, (error, results5) => {
            if (error) {
              console.error('Error en la consulta 5:', error);
              resultado.acarreoALaFecha = { error: 'Ocurrió un error en la consulta 5' };
            } else {
              resultado.acarreoALaFecha = results5[0];
            }

            connection.query(consulta6, (error, results6) => {
              if (error) {
                console.error('Error en la consulta 6:', error);
                resultado.trituradas = { error: 'Ocurrió un error en la consulta 6' };
              } else {
                resultado.trituradas = results6[0];
              }

              res.json(resultado);
            });
          });
        });
      });
    });
  });
};


module.exports.balance = (request, response) => {
  var sql = `SELECT 
              CONCENTRADO.nombre AS concentrado, 
              ELEMENTO.nombre AS elemento, 
              gtonR,
              tms
            FROM 
              elemento JOIN reporte USING(idElemento)
              JOIN concentrado USING(idConcentrado)
            WHERE 
              fecha = '${request.query.fecha}' AND
              (CONCENTRADO.nombre = 'Pb' OR
              CONCENTRADO.nombre = 'Zn' OR 
              CONCENTRADO.nombre = 'Cabeza' OR
              CONCENTRADO.nombre = 'Colas') AND
              idMina = '${request.query.idMina}'`

  connection.query(sql, (error, rows) => {
    if (error) {
      response.send(error);
    }

    const result = {};

    rows.forEach(row => {
      const concentrado = row.concentrado;
      const elemento = row.elemento;
      const total = row.gtonR;
      const tms = row.tms;

      // VERIFICA SI CONCENTRADO EXISTE
      if (!result.hasOwnProperty(concentrado)) {
        // OBJETO PARA CONCENTRADO
        result[concentrado] = {
          tms: tms
        };
      }

      // VERIFICA SI CONCENTRADO EXISTE
      if (!result[concentrado].hasOwnProperty(elemento)) {
        // ELEMENTO PARA ELEMENTO
        result[concentrado][elemento] = total;
      }
    });

    response.json(result);
  });
};

module.exports.movMineral = (request, response) => {
  var query = `SELECT 
                  MINA.nombre,
                  SUM(acarreo) AS 'acarreo',
                  SUM(trituradasP1 + trituradasP2) AS 'trituradas',
                  SUM(acarreo-(trituradasP1+trituradasP2)) as patios
                FROM 
                  mina 
                  JOIN movimiento_mineral USING(idMina)
                WHERE 
                  MOVIMIENTO_MINERAL.fecha = '${request.query.fecha}'
                GROUP BY 
                  idMina`;
  
  const inicial = `SELECT
                    SUM(acarreo-(trituradasP1+trituradasP2)) as inicial
                  FROM 
                    movimiento_mineral
                  WHERE 
                    fecha = DATE_SUB('${request.query.fecha}', INTERVAL 1 DAY)
                  GROUP BY 
                    idMina`;

  connection.query(query, (error, rows) => {
    if (error) {
      response.send(error);
      return;
    }

    connection.query(inicial, (error, rowsI) => {
      if (error) {
        response.send(error);
        return;
      }

      var combinedRows = [];

      for (let i = 0; i < rows.length; i++) {
        var mina = rows[i].nombre;
        var acarreo = rows[i].acarreo;
        var trituradas = rows[i].trituradas;
        var patios = rows[i].patios;
        var inicial = rowsI[i].inicial;

        combinedRows[i] = {
          nombre: mina,
          acarreo: acarreo,
          trituradas: trituradas,
          existenciaPatios: patios,
          existenciaInicial: inicial,
        };
      }

      // ENVÍO DE RESPUESTA HTTP (fuera del bucle)
      response.json(combinedRows);
    });
  });
};

module.exports.embarque = (request, response) => {
  const query = `SELECT 
                      MINA.nombre AS mina, 
                      CONCENTRADO.nombre as concentrado, 
                      SUM(embarque) AS total
                  FROM 
                      mina 
                      JOIN embarque USING(idMina)
                      JOIN concentrado USING(idConcentrado)
                  WHERE
                      EMBARQUE.fecha = '${request.query.fecha}'
                  GROUP BY 
                      MINA.idMina,
                      CONCENTRADO.idConcentrado`

  connection.query(query, (err, rows) => {
    if (err) {
      throw err;
    }

    var combinedRows = {};

    for (let i = 0; i < rows.length; i++) {
      var mina = rows[i].mina;
      var concentrado = rows[i].concentrado;
      var total = rows[i].total;

      if (!combinedRows.hasOwnProperty(mina)) {
        combinedRows[mina] = {};
      }

      combinedRows[mina][concentrado] = total;
    }

    // ENVÍO DE RESPUESTA HTTP
    var result = [];
    for (var mina in combinedRows) {
      var obj = { mina: mina };
      obj = { ...obj, ...combinedRows[mina] };
      result.push(obj);
    }

    response.json(result);
  });
};

module.exports.grapHistoricas = (request, response) => {
  // CONSULTA PARA ACARRADAS Y TRITURADAS
  var query = `SELECT 
                MINA.nombre,
                MONTH(fecha) AS mes,
                SUM(acarreo) AS acarreo,
                SUM(trituradasP1 + trituradasP2) AS 'trituradas'
              FROM mina 
                JOIN movimiento_mineral USING(idMina)
              WHERE
                fecha IS NOT NULL
              GROUP BY
                MONTH(fecha),
                MINA.nombre`;

  connection.query(query, (error, rows1) => {
    if (error) {
        response.send(error);
        return;
    }

    const trituradas = {};
    const acarreo = {};

    rows1.forEach(row => {
      const mes = row.mes;
      const trituradasValue = row.trituradas;
      const acarreoValue = row.acarreo;

      if (!trituradas.hasOwnProperty(mes)) {
        trituradas[mes] = [];
      }

      if (!acarreo.hasOwnProperty(mes)) {
        acarreo[mes] = [];
      }

      trituradas[mes].push(trituradasValue);
      acarreo[mes].push(acarreoValue);
    });

    // CONSULTA PARA CONCENTRADOS
    var concentrados = `SELECT 
                        MONTH(fecha) AS mes, 
                        SUM(embarque) AS totalConcentrados,
                        CONCENTRADO.nombre
                      FROM 
                        embarque
                        JOIN concentrado USING(idConcentrado)
                        JOIN mina USING(idMina)
                      WHERE
                        FECHA IS NOT NULL
                      GROUP BY 
                        MONTH(fecha),
                        EMBARQUE.idConcentrado`;

  connection.query(concentrados, (error, rows2) => {
    if (error) {
      response.send(error);
      return;
    }

    const result = {};

    rows2.forEach(row => {
      const mes = row.mes;
      const total = row.totalConcentrados;

      if (!result[mes]) {
        result[mes] = [];
      }

      result[mes].push(total);
    });

    const combinedRows = {
      trituradas: trituradas,
      acarreo: acarreo,
      concentrados: result
    };

      // ENVÍO DE RESPUESTA HTTP
      response.json(combinedRows);
    });
  });
};

module.exports.movMineralTable = (request, response) => {
  const sql = `SELECT
                idMovimiento, 
                SUM(acarreo) AS acarreo,
                SUM(trituradasP1 + trituradasP2) AS trituradas,
                SUM(acarreo-(trituradasP1+trituradasP2)) as patios,
                fecha
              FROM 
                movimiento_mineral
              GROUP BY 
                fecha`;

  connection.query(sql, (error, rows) => {
    if (error) {
      response.send(error);
      return;
    }

    const combinedRows = [];

    let completedQueries = 0; // CONTADOR

    for (let i = 0; i < rows.length; i++) {
      const acarreo = rows[i].acarreo;
      const trituradas = rows[i].trituradas;
      const patios = rows[i].patios;
      const id = rows[i].idMovimiento;
      const fecha = rows[i].fecha;

      const inicial = `SELECT
                        SUM(acarreo-(trituradasP1+trituradasP2)) as inicial
                      FROM 
                        movimiento_mineral
                      WHERE 
                        fecha = DATE_SUB('${fecha}', INTERVAL 1 DAY)`;

      connection.query(inicial, (error, rows2) => {
        if (error) {
          response.send(error);
          return;
        }

        const inicialValue = rows2[0].inicial + trituradas;

        combinedRows[i] = {
          id: id,
          fecha: fecha,
          acarreo: acarreo,
          trituradas: trituradas,
          patios: patios,
          inicial: inicialValue,
        };

        completedQueries++;

        // VERIFICA SI SE HA COMPLETADO
        if (completedQueries === rows.length) {
          // ENVÍO DE RESPUESTA HTTP
          response.json(combinedRows);
        }
      });
    }
  });
};

module.exports.reporteTable = (request, response) => {
  const sql = `SELECT
                idReporte, 
                REPORTE.fecha AS fecha,
                (PRECIO_CONCENTRADO.precio * tms) AS Cu
              FROM 
                reporte JOIN concentrado USING(idConcentrado)
                JOIN precio_concentrado USING(idConcentrado)
              WHERE
                CONCENTRADO.nombre = 'Cu' 
              GROUP BY 
                REPORTE.fecha`;

  connection.query(sql, (error, rowsCu) => {
    if (error) {
      response.send(error);
      return;
    }

    const query = `SELECT
                    idReporte, 
                    REPORTE.fecha AS fecha,
                    (PRECIO_CONCENTRADO.precio * tms) AS Zn,
                    tms
                  FROM 
                    reporte JOIN concentrado USING(idConcentrado)
                    JOIN precio_concentrado USING(idConcentrado)
                  WHERE
                    CONCENTRADO.nombre = 'Zn' 
                  GROUP BY 
                    REPORTE.fecha`;

    connection.query(query, (error, rowsZn) => {
      if (error) {
        response.send(error);
        return;
      }

      var combinedRows = [];

      for (let i = 0; i < rowsCu.length; i++) {
        var idReporte = rowsCu[i].idReporte;
        var fecha = rowsZn[i].fecha;
        var cu = rowsCu[i].Cu;
        var zn = rowsZn[i].Zn;
        var liquidacion = rowsCu[i].Cu + rowsZn[i].Zn;
        var valor = liquidacion / rowsZn[i].tms;

        combinedRows[i] = {
          id: idReporte,
          fecha: fecha,
          cu: cu,
          zn: zn,
          liquidacion: liquidacion,
          valor: valor
        };
      }

      // ENVÍO DE RESPUESTA HTTP
      response.json(combinedRows);
    });
  });
}

module.exports.liquidacion = (request, response) => {
  const cu = `SELECT
                PRECIO_CONCENTRADO.precio AS Cu,
                REPORTE.idReporte,
                REPORTE.fecha
              FROM 
                reporte JOIN concentrado USING(idConcentrado)
                JOIN precio_concentrado USING(idConcentrado)
              WHERE
                CONCENTRADO.nombre = 'Cu' 
                AND PRECIO_CONCENTRADO.fecha = '${request.query.fecha}' 
                AND idMina = '${request.query.idMina}'
              GROUP BY 
                REPORTE.fecha`;

  const zn = `SELECT
                PRECIO_CONCENTRADO.precio AS Zn,
                tms
              FROM 
                reporte JOIN concentrado USING(idConcentrado)
                JOIN precio_concentrado USING(idConcentrado)
              WHERE
                CONCENTRADO.nombre = 'Zn' 
                AND PRECIO_CONCENTRADO.fecha = '${request.query.fecha}' 
                AND idMina = '${request.query.idMina}'
              GROUP BY 
                REPORTE.fecha`;
  
  const acumuladoCu = `SELECT 
                          SUM(PRECIO_CONCENTRADO.precio) AS 'totalCu'
                      FROM concentrado JOIN precio_concentrado USING(idConcentrado)
                      WHERE 
                        CONCENTRADO.nombre = 'Cu' 
                        AND MONTH(PRECIO_CONCENTRADO.fecha) = MONTH('${request.query.fecha}') 
                        AND YEAR(PRECIO_CONCENTRADO.fecha) = YEAR('${request.query.fecha}')`;
  
  const acumuladoZn = `SELECT 
                        SUM(PRECIO_CONCENTRADO.precio) AS 'totalZn'
                      FROM concentrado JOIN precio_concentrado USING(idConcentrado)
                      WHERE 
                        CONCENTRADO.nombre = 'Zn' 
                        AND MONTH(PRECIO_CONCENTRADO.fecha) = MONTH('${request.query.fecha}') 
                        AND YEAR(PRECIO_CONCENTRADO.fecha) = YEAR('${request.query.fecha}')`;
          
  const acumuladoTMS = `SELECT
                        SUM(tms) AS 'totalTMS'
                      FROM reporte
                      WHERE 
                        MONTH(fecha) = MONTH('${request.query.fecha}')
                        AND YEAR(fecha) = YEAR('${request.query.fecha}')`;
        
  connection.query(cu, (error, rowsCu) => {
    if (error) {
      response.send(error);
      return;
    }

    connection.query(zn, (error, rowsZn) => {
      if (error) {
        response.send(error);
        return;
      }

      connection.query(acumuladoCu, (error, rowsAcumuladoCu) => {
        if (error) {
          response.send(error);
          return;
        }

        connection.query(acumuladoZn, (error, rowsAcumuladoZn) => {
          if (error) {
            response.send(error);
            return;
          }

          connection.query(acumuladoTMS, (error, rowsAcumuladoTMS) => {
            if (error) {
              response.send(error);
              return;
            }

            var combinedRows = [];
            console.log(rowsAcumuladoTMS[0].totalTMS);

            for (let i = 0; i < rowsCu.length; i++) {
              var cu = rowsCu[i].Cu;
              var zn = rowsZn[i].Zn;
              var acumuladoCu = rowsAcumuladoCu[0].totalCu;
              var acumuladoZn = rowsAcumuladoZn[0].totalZn;
              var liquidacionAcumulada = acumuladoCu + acumuladoZn;
              var valorAcumulado = liquidacionAcumulada / rowsAcumuladoTMS[0].totalTMS;
              var liquidacion = cu + zn;
              var valor = liquidacion / rowsZn[i].tms;

              combinedRows[i] = {
                cu: cu,
                zn: zn,
                acumuladoCu: acumuladoCu,
                acumuladoZn: acumuladoZn,
                totalAcumulado: liquidacionAcumulada,
                totalHoy: liquidacion,
                valorHoy: valor,
                valorAcumulado: valorAcumulado
              };
            }

            // ENVÍO DE RESPUESTA HTTP
            response.json(combinedRows);
          });
        });
      });
    });
  });
};

module.exports.grapliquidacion = (request, response) => {
  const sqlLiquidacion = `SELECT 
                            precio,
                            MONTH(fecha) AS mes,
                            CONCENTRADO.nombre
                          FROM 
                            concentrado JOIN precio_concentrado USING(idConcentrado)
                          GROUP BY
                            mes,
                            YEAR(fecha),
                            CONCENTRADO.nombre`;

  const sqlCu = `SELECT
                    MONTH(REPORTE.fecha) AS mes,
                    (PRECIO_CONCENTRADO.precio * tms) AS Cu,
                    tms
                  FROM 
                    reporte JOIN concentrado USING(idConcentrado)
                    JOIN precio_concentrado USING(idConcentrado)
                  WHERE
                    CONCENTRADO.nombre = 'Cu' 
                  GROUP BY 
                    mes`;

  const sqlZn = `SELECT
                    MONTH(REPORTE.fecha) AS mes,
                    (PRECIO_CONCENTRADO.precio * tms) AS Zn,
                    tms
                  FROM 
                    reporte JOIN concentrado USING(idConcentrado)
                    JOIN precio_concentrado USING(idConcentrado)
                  WHERE
                    CONCENTRADO.nombre = 'Zn' 
                  GROUP BY 
                    mes`;

  connection.query(sqlLiquidacion, (error, rowsLiquidacion) => {
    if (error) {
      response.send(error);
      return;
    }

    connection.query(sqlCu, (error, rowsCu) => {
      if (error) {
        response.send(error);
        return;
      }

      connection.query(sqlZn, (error, rowsZn) => {
        if (error) {
          response.send(error);
          return;
        }

        const metalesObj = {};
        const valorObj = {};

        rowsLiquidacion.forEach((row) => {
          const mes = row.mes;
          const precio = row.precio;

          if (!metalesObj[mes]) {
            metalesObj[mes] = [];
          }

          metalesObj[mes].push(precio);
        });

        for (let i = 0; i < rowsCu.length; i++) {
          var mes = rowsCu[i].mes;
          var valor = (rowsCu[i].Cu + rowsZn[i].Zn) / rowsCu[i].tms;

          if (!valorObj[mes]) {
            valorObj[mes] = [];
          }

          valorObj[mes].push(valor);
        }

        const result = {
          metales: metalesObj,
          valor: valorObj
        };

        // ENVÍO DE RESPUESTA HTTP
        response.json(result);
      });
    });
  });
};

