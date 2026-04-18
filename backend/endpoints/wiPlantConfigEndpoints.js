/**
 * Work Instructions - Plant Configuration Endpoints
 * Hierarchy: Plant → Area → Line → Station
 */

const { query } = require('../config/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

const setupWIPlantConfigEndpoints = (app) => {

  // ============================================================================
  // PLANTS
  // ============================================================================

  // GET all plants with counts
  app.get('/wi-config/plants', async (req, res) => {
    try {
      const result = await query(`
        SELECT
          p.*,
          (SELECT COUNT(*) FROM wi_areas WHERE plant_id = p.id) as area_count,
          (SELECT COUNT(*) FROM wi_lines l JOIN wi_areas a ON l.area_id = a.id WHERE a.plant_id = p.id) as line_count,
          (SELECT COUNT(*) FROM wi_stations s JOIN wi_lines l ON s.line_id = l.id JOIN wi_areas a ON l.area_id = a.id WHERE a.plant_id = p.id) as station_count
        FROM wi_plants p
        ORDER BY p.name
      `);

      res.json({
        success: true,
        plants: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching plants:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET single plant with full hierarchy
  app.get('/wi-config/plants/:id', async (req, res) => {
    try {
      const plantId = parseInt(req.params.id);

      const plantResult = await query('SELECT * FROM wi_plants WHERE id = $1', [plantId]);
      if (plantResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Plant not found' });
      }

      // Get areas with lines and stations
      const areasResult = await query(`
        SELECT a.*,
          (SELECT json_agg(
            json_build_object(
              'id', l.id,
              'name', l.name,
              'code', l.code,
              'description', l.description,
              'capacityPerHour', l.capacity_per_hour,
              'isActive', l.is_active,
              'displayOrder', l.display_order,
              'stations', (
                SELECT COALESCE(json_agg(
                  json_build_object(
                    'id', s.id,
                    'name', s.name,
                    'code', s.code,
                    'description', s.description,
                    'stationType', s.station_type,
                    'cycleTimeSeconds', s.cycle_time_seconds,
                    'isActive', s.is_active,
                    'displayOrder', s.display_order
                  ) ORDER BY s.display_order
                ), '[]')
                FROM wi_stations s WHERE s.line_id = l.id
              )
            ) ORDER BY l.display_order
          ) FILTER (WHERE l.id IS NOT NULL), '[]')
          FROM wi_lines l WHERE l.area_id = a.id
        ) as lines
        FROM wi_areas a
        WHERE a.plant_id = $1
        ORDER BY a.display_order
      `, [plantId]);

      const plant = {
        ...plantResult.rows[0],
        areas: areasResult.rows
      };

      res.json({
        success: true,
        plant: transformToCamelCase(plant)
      });
    } catch (error) {
      console.error('Error fetching plant:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // POST create plant
  app.post('/wi-config/plants', async (req, res) => {
    try {
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        INSERT INTO wi_plants (name, code, description, address, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [data.name, data.code, data.description, data.address, data.created_by]);

      res.json({
        success: true,
        plant: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error creating plant:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update plant
  app.put('/wi-config/plants/:id', async (req, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE wi_plants
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            description = COALESCE($3, description),
            address = COALESCE($4, address),
            is_active = COALESCE($5, is_active)
        WHERE id = $6
        RETURNING *
      `, [data.name, data.code, data.description, data.address, data.is_active, plantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Plant not found' });
      }

      res.json({
        success: true,
        plant: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating plant:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE plant
  app.delete('/wi-config/plants/:id', async (req, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const result = await query('DELETE FROM wi_plants WHERE id = $1 RETURNING *', [plantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Plant not found' });
      }

      res.json({ success: true, message: 'Plant deleted' });
    } catch (error) {
      console.error('Error deleting plant:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // AREAS
  // ============================================================================

  // POST create area
  app.post('/wi-config/plants/:plantId/areas', async (req, res) => {
    try {
      const plantId = parseInt(req.params.plantId);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        INSERT INTO wi_areas (plant_id, name, code, description, display_order)
        VALUES ($1, $2, $3, $4, COALESCE($5, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM wi_areas WHERE plant_id = $1)))
        RETURNING *
      `, [plantId, data.name, data.code, data.description, data.display_order]);

      res.json({
        success: true,
        area: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error creating area:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update area
  app.put('/wi-config/areas/:id', async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE wi_areas
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            description = COALESCE($3, description),
            is_active = COALESCE($4, is_active),
            display_order = COALESCE($5, display_order)
        WHERE id = $6
        RETURNING *
      `, [data.name, data.code, data.description, data.is_active, data.display_order, areaId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Area not found' });
      }

      res.json({
        success: true,
        area: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating area:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE area
  app.delete('/wi-config/areas/:id', async (req, res) => {
    try {
      const areaId = parseInt(req.params.id);
      const result = await query('DELETE FROM wi_areas WHERE id = $1 RETURNING *', [areaId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Area not found' });
      }

      res.json({ success: true, message: 'Area deleted' });
    } catch (error) {
      console.error('Error deleting area:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // LINES
  // ============================================================================

  // POST create line
  app.post('/wi-config/areas/:areaId/lines', async (req, res) => {
    try {
      const areaId = parseInt(req.params.areaId);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        INSERT INTO wi_lines (area_id, name, code, description, capacity_per_hour, display_order)
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM wi_lines WHERE area_id = $1)))
        RETURNING *
      `, [areaId, data.name, data.code, data.description, data.capacity_per_hour, data.display_order]);

      res.json({
        success: true,
        line: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error creating line:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update line
  app.put('/wi-config/lines/:id', async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE wi_lines
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            description = COALESCE($3, description),
            capacity_per_hour = COALESCE($4, capacity_per_hour),
            is_active = COALESCE($5, is_active),
            display_order = COALESCE($6, display_order)
        WHERE id = $7
        RETURNING *
      `, [data.name, data.code, data.description, data.capacity_per_hour, data.is_active, data.display_order, lineId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Line not found' });
      }

      res.json({
        success: true,
        line: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating line:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE line
  app.delete('/wi-config/lines/:id', async (req, res) => {
    try {
      const lineId = parseInt(req.params.id);
      const result = await query('DELETE FROM wi_lines WHERE id = $1 RETURNING *', [lineId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Line not found' });
      }

      res.json({ success: true, message: 'Line deleted' });
    } catch (error) {
      console.error('Error deleting line:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // STATIONS
  // ============================================================================

  // POST create station
  app.post('/wi-config/lines/:lineId/stations', async (req, res) => {
    try {
      const lineId = parseInt(req.params.lineId);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        INSERT INTO wi_stations (line_id, name, code, description, station_type, cycle_time_seconds, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM wi_stations WHERE line_id = $1)))
        RETURNING *
      `, [lineId, data.name, data.code, data.description, data.station_type, data.cycle_time_seconds, data.display_order]);

      res.json({
        success: true,
        station: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error creating station:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // PUT update station
  app.put('/wi-config/stations/:id', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const data = transformToSnakeCase(req.body);

      const result = await query(`
        UPDATE wi_stations
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            description = COALESCE($3, description),
            station_type = COALESCE($4, station_type),
            cycle_time_seconds = COALESCE($5, cycle_time_seconds),
            is_active = COALESCE($6, is_active),
            display_order = COALESCE($7, display_order)
        WHERE id = $8
        RETURNING *
      `, [data.name, data.code, data.description, data.station_type, data.cycle_time_seconds, data.is_active, data.display_order, stationId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Station not found' });
      }

      res.json({
        success: true,
        station: transformToCamelCase(result.rows[0])
      });
    } catch (error) {
      console.error('Error updating station:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // DELETE station
  app.delete('/wi-config/stations/:id', async (req, res) => {
    try {
      const stationId = parseInt(req.params.id);
      const result = await query('DELETE FROM wi_stations WHERE id = $1 RETURNING *', [stationId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Station not found' });
      }

      res.json({ success: true, message: 'Station deleted' });
    } catch (error) {
      console.error('Error deleting station:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ============================================================================
  // HIERARCHY VIEW (for dropdowns)
  // ============================================================================

  // GET all stations with full path (for step assignment dropdown)
  app.get('/wi-config/stations/hierarchy', async (req, res) => {
    try {
      const result = await query('SELECT * FROM wi_station_hierarchy ORDER BY full_path');

      res.json({
        success: true,
        stations: transformToCamelCase(result.rows)
      });
    } catch (error) {
      console.error('Error fetching station hierarchy:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // GET station types (for dropdown)
  app.get('/wi-config/station-types', async (req, res) => {
    try {
      const types = [
        { value: 'assembly', label: 'Ensamble' },
        { value: 'inspection', label: 'Inspección' },
        { value: 'packaging', label: 'Empaque' },
        { value: 'testing', label: 'Pruebas' },
        { value: 'rework', label: 'Retrabajo' },
        { value: 'welding', label: 'Soldadura' },
        { value: 'painting', label: 'Pintura' },
        { value: 'machining', label: 'Maquinado' },
        { value: 'other', label: 'Otro' }
      ];

      res.json({ success: true, types });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

};

module.exports = setupWIPlantConfigEndpoints;
