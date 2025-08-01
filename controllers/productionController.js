const { ProductionSchedule, ProductionBatch, ProductionStep, User, Product } = require('../models');
const workflowParser = require('../utils/workflowParser');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const notificationHelper = require('../utils/notificationHelper');

/**
 * Production Planning Controller
 * Handles all production scheduling, batch management, and workflow execution
 */

// ============================================================================
// PRODUCTION SCHEDULES
// ============================================================================

/**
 * Get production schedules
 * @route GET /api/production/schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      status, 
      type = 'daily',
      limit = 50,
      offset = 0 
    } = req.query;

    const whereClause = {};
    
    // Date range filter
    if (startDate && endDate) {
      whereClause.scheduleDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.scheduleDate = {
        [Op.gte]: startDate
      };
    } else if (endDate) {
      whereClause.scheduleDate = {
        [Op.lte]: endDate
      };
    }
    
    // Status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    // Type filter
    if (type && type !== 'all') {
      whereClause.scheduleType = type;
    }

    const schedules = await ProductionSchedule.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'Approver',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['scheduleDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        schedules: schedules.rows,
        total: schedules.count,
        hasMore: (parseInt(offset) + schedules.rows.length) < schedules.count
      }
    });
  } catch (error) {
    logger.error('Error fetching production schedules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production schedules'
    });
  }
};

/**
 * Create new production schedule
 * @route POST /api/production/schedules
 */
exports.createSchedule = async (req, res) => {
  try {
    const {
      scheduleDate,
      scheduleType = 'daily',
      workdayStartTime = '06:00:00',
      workdayEndTime = '18:00:00',
      availableStaffIds = [],
      staffShifts = {},
      availableEquipment = [],
      dailyTargets = {},
      planningNotes,
      specialRequests = [],
      environmentalConditions = {}
    } = req.body;

    // Validate required fields
    if (!scheduleDate) {
      return res.status(400).json({
        success: false,
        error: 'Schedule date is required'
      });
    }

    // Check if schedule already exists for this date
    const existingSchedule = await ProductionSchedule.findOne({
      where: { scheduleDate }
    });

    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        error: 'Production schedule already exists for this date'
      });
    }

    // Calculate total staff hours
    const totalStaffHours = Object.values(staffShifts).reduce((total, shift) => {
      if (shift.start && shift.end) {
        const start = new Date(`1970-01-01T${shift.start}`);
        const end = new Date(`1970-01-01T${shift.end}`);
        const hours = (end - start) / (1000 * 60 * 60);
        return total + Math.max(hours, 0);
      }
      return total;
    }, 0);

    const schedule = await ProductionSchedule.create({
      scheduleDate,
      scheduleType,
      workdayStartTime,
      workdayEndTime,
      availableStaffIds,
      staffShifts,
      totalStaffHours,
      availableEquipment,
      dailyTargets,
      planningNotes,
      specialRequests,
      environmentalConditions,
      createdBy: req.user?.id,
      status: 'draft'
    });

    // Send notification
    await notificationHelper.sendNotification({
      userId: req.user?.id,
      title: 'Neuer Produktionsplan erstellt',
      message: `Produktionsplan für ${scheduleDate} wurde erstellt`,
      type: 'info',
      category: 'production',
      priority: 'low',
      templateKey: 'production.schedule_created',
      templateVars: {
        date: scheduleDate,
        type: scheduleType
      }
    });

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Error creating production schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create production schedule'
    });
  }
};

/**
 * Update production schedule
 * @route PUT /api/production/schedules/:id
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await ProductionSchedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Production schedule not found'
      });
    }

    // Recalculate staff hours if staffShifts changed
    if (updateData.staffShifts) {
      updateData.totalStaffHours = Object.values(updateData.staffShifts).reduce((total, shift) => {
        if (shift.start && shift.end) {
          const start = new Date(`1970-01-01T${shift.start}`);
          const end = new Date(`1970-01-01T${shift.end}`);
          const hours = (end - start) / (1000 * 60 * 60);
          return total + Math.max(hours, 0);
        }
        return total;
      }, 0);
    }

    await schedule.update(updateData);

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Error updating production schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update production schedule'
    });
  }
};

// ============================================================================
// PRODUCTION BATCHES
// ============================================================================

/**
 * Get production batches
 * @route GET /api/production/batches
 */
exports.getBatches = async (req, res) => {
  try {
    const {
      scheduleDate,
      status,
      workflowId,
      priority,
      assignedStaff,
      limit = 50,
      offset = 0
    } = req.query;

    const whereClause = {};

    // Date range filter (planned start time within the day)
    if (scheduleDate) {
      const startOfDay = new Date(`${scheduleDate}T00:00:00.000Z`);
      const endOfDay = new Date(`${scheduleDate}T23:59:59.999Z`);
      
      whereClause.plannedStartTime = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    // Status filter
    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        whereClause.status = { [Op.in]: status };
      } else if (status.includes(',')) {
        whereClause.status = { [Op.in]: status.split(',') };
      } else {
        whereClause.status = status;
      }
    }

    // Workflow filter
    if (workflowId && workflowId !== 'all') {
      whereClause.workflowId = workflowId;
    }

    // Priority filter
    if (priority && priority !== 'all') {
      whereClause.priority = priority;
    }

    // Staff filter (JSON search)
    if (assignedStaff) {
      // This is SQLite compatible JSON search
      whereClause[Op.and] = [
        {
          assignedStaffIds: {
            [Op.like]: `%${assignedStaff}%`
          }
        }
      ];
    }

    const batches = await ProductionBatch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'category', 'price']
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['id', 'username']
        },
        {
          model: ProductionStep,
          required: false,
          where: { status: ['in_progress', 'waiting', 'failed'] },
          limit: 1
        }
      ],
      order: [['plannedStartTime', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        batches: batches.rows,
        total: batches.count,
        hasMore: (parseInt(offset) + batches.rows.length) < batches.count
      }
    });
  } catch (error) {
    logger.error('Error fetching production batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production batches'
    });
  }
};

/**
 * Create new production batch
 * @route POST /api/production/batches
 */
exports.createBatch = async (req, res) => {
  try {
    const {
      name,
      workflowId,
      productId,
      plannedStartTime,
      plannedQuantity = 1,
      unit = 'pieces',
      priority = 'medium',
      assignedStaffIds = [],
      requiredEquipment = [],
      notes
    } = req.body;

    // Validate required fields
    if (!name || !workflowId || !plannedStartTime) {
      return res.status(400).json({
        success: false,
        error: 'Name, workflow ID, and planned start time are required'
      });
    }

    // Validate workflow exists
    const workflow = await workflowParser.getWorkflowById(workflowId);
    if (!workflow) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workflow ID'
      });
    }

    // Calculate estimated end time based on workflow
    const totalDurationMinutes = workflow.steps.reduce((total, step) => {
      if (step.timeout) {
        const timeValue = parseInt(step.timeout.replace(/[^0-9]/g, ''));
        const timeUnit = step.timeout.replace(/[0-9]/g, '').trim();
        
        let minutes = timeValue;
        if (timeUnit.startsWith('h')) minutes *= 60;
        
        return total + minutes;
      }
      if (step.duration) {
        const timeValue = parseInt(step.duration.replace(/[^0-9]/g, ''));
        const timeUnit = step.duration.replace(/[0-9]/g, '').trim();
        
        let minutes = timeValue;
        if (timeUnit.startsWith('h')) minutes *= 60;
        
        return total + minutes;
      }
      return total + 30; // Default 30 minutes per step
    }, 0);

    const plannedEndTime = new Date(new Date(plannedStartTime).getTime() + (totalDurationMinutes * 60 * 1000));

    const batch = await ProductionBatch.create({
      name,
      workflowId,
      productId,
      plannedStartTime,
      plannedEndTime,
      plannedQuantity,
      unit,
      priority,
      assignedStaffIds,
      requiredEquipment,
      notes,
      createdBy: req.user?.id,
      status: 'planned'
    });

    // Create production steps from workflow
    const steps = workflow.steps.map((step, index) => ({
      batchId: batch.id,
      stepIndex: index,
      stepName: step.name,
      stepType: step.type || 'active',
      activities: step.activities || [],
      conditions: step.conditions || [],
      parameters: step.params || {},
      workflowNotes: step.notes,
      location: step.location,
      repeatCount: step.repeat || 1,
      requiredEquipment: step.equipment || [],
      plannedDurationMinutes: (() => {
        if (step.timeout) {
          const timeValue = parseInt(step.timeout.replace(/[^0-9]/g, ''));
          const timeUnit = step.timeout.replace(/[0-9]/g, '').trim();
          return timeUnit.startsWith('h') ? timeValue * 60 : timeValue;
        }
        if (step.duration) {
          const timeValue = parseInt(step.duration.replace(/[^0-9]/g, ''));
          const timeUnit = step.duration.replace(/[0-9]/g, '').trim();
          return timeUnit.startsWith('h') ? timeValue * 60 : timeValue;
        }
        return 30;
      })()
    }));

    await ProductionStep.bulkCreate(steps);

    // Send notification
    await notificationHelper.sendNotification({
      userId: req.user?.id,
      title: 'Neuer Produktionsauftrag',
      message: `${name} wurde für ${new Date(plannedStartTime).toLocaleString('de-DE')} geplant`,
      type: 'info',
      category: 'production',
      priority: 'low',
      templateKey: 'production.batch_created',
      templateVars: {
        batchName: name,
        startTime: plannedStartTime,
        quantity: plannedQuantity,
        unit: unit
      }
    });

    res.status(201).json({
      success: true,
      data: batch
    });
  } catch (error) {
    logger.error('Error creating production batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create production batch'
    });
  }
};

/**
 * Start production batch
 * @route POST /api/production/batches/:id/start
 */
exports.startBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await ProductionBatch.findByPk(id, {
      include: [{ model: ProductionStep }]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Production batch not found'
      });
    }

    if (batch.status !== 'planned' && batch.status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: 'Batch cannot be started in current status'
      });
    }

    const now = new Date();
    
    // Update batch status
    await batch.update({
      status: 'in_progress',
      actualStartTime: now,
      updatedBy: req.user?.id
    });

    // Start first step
    const firstStep = batch.ProductionSteps[0];
    if (firstStep) {
      await firstStep.update({
        status: 'ready',
        actualStartTime: now
      });
    }

    // Send notification
    await notificationHelper.sendNotification({
      userId: req.user?.id,
      title: 'Produktion gestartet',
      message: `${batch.name} wurde gestartet`,
      type: 'info',
      category: 'production',
      priority: 'medium',
      templateKey: 'production.start',
      templateVars: {
        batchName: batch.name,
        startTime: now.toLocaleString('de-DE')
      }
    });

    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    logger.error('Error starting production batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start production batch'
    });
  }
};

// ============================================================================
// PRODUCTION STEPS
// ============================================================================

/**
 * Get production steps for a batch
 * @route GET /api/production/batches/:batchId/steps
 */
exports.getBatchSteps = async (req, res) => {
  try {
    const { batchId } = req.params;

    const steps = await ProductionStep.findAll({
      where: { batchId },
      include: [
        {
          model: User,
          as: 'Completer',
          attributes: ['id', 'username']
        }
      ],
      order: [['stepIndex', 'ASC']]
    });

    res.json({
      success: true,
      data: steps
    });
  } catch (error) {
    logger.error('Error fetching production steps:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production steps'
    });
  }
};

/**
 * Update production step
 * @route PUT /api/production/steps/:id
 */
exports.updateStep = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const step = await ProductionStep.findByPk(id, {
      include: [{ model: ProductionBatch }]
    });

    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Production step not found'
      });
    }

    // Handle status changes
    if (updateData.status && updateData.status !== step.status) {
      const now = new Date();
      
      switch (updateData.status) {
        case 'in_progress':
          updateData.actualStartTime = now;
          break;
        case 'completed':
          updateData.actualEndTime = now;
          updateData.completedBy = req.user?.id;
          updateData.progress = 100;
          break;
        case 'failed':
          updateData.actualEndTime = now;
          updateData.hasIssues = true;
          break;
      }
    }

    await step.update(updateData);

    // Check if batch should be updated
    if (updateData.status === 'completed') {
      await this.checkBatchCompletion(step.ProductionBatch);
    }

    res.json({
      success: true,
      data: step
    });
  } catch (error) {
    logger.error('Error updating production step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update production step'
    });
  }
};

/**
 * Complete production step
 * @route POST /api/production/steps/:id/complete
 */
exports.completeStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { qualityResults, actualParameters, notes } = req.body;

    const step = await ProductionStep.findByPk(id, {
      include: [{ model: ProductionBatch }]
    });

    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Production step not found'
      });
    }

    if (step.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Step is not in progress'
      });
    }

    const now = new Date();
    
    await step.update({
      status: 'completed',
      actualEndTime: now,
      completedBy: req.user?.id,
      progress: 100,
      qualityResults: qualityResults || step.qualityResults,
      actualParameters: actualParameters || step.actualParameters,
      notes: notes || step.notes
    });

    // Start next step if available
    const nextStep = await ProductionStep.findOne({
      where: {
        batchId: step.batchId,
        stepIndex: step.stepIndex + 1
      }
    });

    if (nextStep && nextStep.status === 'pending') {
      await nextStep.update({
        status: 'ready',
        plannedStartTime: now
      });
    }

    // Check batch completion
    await this.checkBatchCompletion(step.ProductionBatch);

    res.json({
      success: true,
      data: step
    });
  } catch (error) {
    logger.error('Error completing production step:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete production step'
    });
  }
};

// ============================================================================
// PRODUCTION ANALYTICS
// ============================================================================

/**
 * Get production analytics
 * @route GET /api/production/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get batch statistics
    const batchStats = await ProductionBatch.findAll({
      where: {
        plannedStartTime: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'status',
        'priority',
        'workflowId',
        [ProductionBatch.sequelize.fn('COUNT', ProductionBatch.sequelize.col('id')), 'count'],
        [ProductionBatch.sequelize.fn('AVG', 
          ProductionBatch.sequelize.literal(
            'CASE WHEN actualEndTime IS NOT NULL AND actualStartTime IS NOT NULL ' +
            'THEN (julianday(actualEndTime) - julianday(actualStartTime)) * 24 * 60 ' +
            'ELSE NULL END'
          )
        ), 'avgDurationMinutes']
      ],
      group: ['status', 'priority', 'workflowId'],
      raw: true
    });

    // Get efficiency metrics
    const efficiencyData = await ProductionBatch.findAll({
      where: {
        plannedStartTime: {
          [Op.between]: [start, end]
        },
        status: 'completed'
      },
      attributes: [
        [ProductionBatch.sequelize.fn('DATE', ProductionBatch.sequelize.col('plannedStartTime')), 'date'],
        [ProductionBatch.sequelize.fn('COUNT', ProductionBatch.sequelize.col('id')), 'completedBatches'],
        [ProductionBatch.sequelize.fn('SUM', ProductionBatch.sequelize.col('actualQuantity')), 'totalProduced'],
        [ProductionBatch.sequelize.fn('AVG', 
          ProductionBatch.sequelize.literal(
            'CASE WHEN actualEndTime > plannedEndTime THEN 1 ELSE 0 END'
          )
        ), 'delayRate']
      ],
      group: [ProductionBatch.sequelize.fn('DATE', ProductionBatch.sequelize.col('plannedStartTime'))],
      order: [[ProductionBatch.sequelize.fn('DATE', ProductionBatch.sequelize.col('plannedStartTime')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        batchStats,
        efficiencyData,
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching production analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch production analytics'
    });
  }
};

// ============================================================================
// HELPER METHODS
// ============================================================================

/**
 * Check if batch is completed and update status
 */
exports.checkBatchCompletion = async (batch) => {
  try {
    const steps = await ProductionStep.findAll({
      where: { batchId: batch.id }
    });

    const completedSteps = steps.filter(step => step.status === 'completed');
    const failedSteps = steps.filter(step => step.status === 'failed');

    if (failedSteps.length > 0) {
      await batch.update({
        status: 'failed',
        actualEndTime: new Date()
      });
      
      // Send failure notification
      await notificationHelper.sendNotification({
        title: 'Produktion fehlgeschlagen',
        message: `${batch.name} konnte nicht abgeschlossen werden`,
        type: 'error',
        category: 'production',
        priority: 'high',
        templateKey: 'production.batch_failed',
        templateVars: {
          batchName: batch.name,
          failedSteps: failedSteps.length
        }
      });
    } else if (completedSteps.length === steps.length) {
      await batch.update({
        status: 'completed',
        actualEndTime: new Date(),
        actualQuantity: batch.plannedQuantity // Can be overridden
      });
      
      // Send completion notification
      await notificationHelper.sendNotification({
        title: 'Produktion abgeschlossen',
        message: `${batch.name} wurde erfolgreich abgeschlossen`,
        type: 'success',
        category: 'production',
        priority: 'low',
        templateKey: 'production.complete',
        templateVars: {
          batchName: batch.name,
          quantity: batch.actualQuantity || batch.plannedQuantity,
          unit: batch.unit,
          duration: batch.actualDurationMinutes || 0
        }
      });
    }
  } catch (error) {
    logger.error('Error checking batch completion:', error);
  }
};