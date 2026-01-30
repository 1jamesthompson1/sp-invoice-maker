// Hours Tracker Plugin - Shows hours worked per project in the last month
console.log('Hours Tracker plugin loaded!');

// Calculate hours worked per project in the last month
async function showProjectHours() {
  try {
    // Get all tasks
    const tasks = await PluginAPI.getTasks();

    console.log('Fetched tasks:', tasks[0]);
    const archivedTasks = await PluginAPI.getArchivedTasks();
    const allTasks = [...tasks, ...archivedTasks];
    
    // Get all projects
    const projects = await PluginAPI.getAllProjects();

    console.log('Fetched projects:', projects[2]);

    
    // Get tasks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calculate hours per project
    const hoursPerProject = {};
    
    allTasks.forEach(task => {
      // Check if task has timeSpent (in milliseconds)
      if (task.timeSpent && task.timeSpent > 0) {
        // Check if task is within last 30 days
        const taskDate = task.changed || task.created;
        if (taskDate && new Date(taskDate) > thirtyDaysAgo) {
          const projectId = task.projectId || 'No Project';
          const hours = task.timeSpent / (1000 * 60 * 60); // Convert ms to hours
          
          if (!hoursPerProject[projectId]) {
            hoursPerProject[projectId] = 0;
          }
          hoursPerProject[projectId] += hours;
        }
      }
    });
    
    // Build message with project names and hours
    let message = '<strong>Hours Worked (Last 30 Days)</strong><br><br>';
    
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.id] = p.title;
    });
    
    let totalHours = 0;
    const sortedProjects = Object.entries(hoursPerProject)
      .sort((a, b) => b[1] - a[1]); // Sort by hours descending
    
    if (sortedProjects.length === 0) {
      message += 'No time tracked in the last 30 days.';
    } else {
      sortedProjects.forEach(([projectId, hours]) => {
        const projectName = projectId === 'No Project' ? 'No Project' : (projectMap[projectId] || 'Unknown Project');
        message += `${projectName}: <strong>${hours.toFixed(2)} hours</strong><br>`;
        totalHours += hours;
      });
      message += `<br><strong>Total: ${totalHours.toFixed(2)} hours</strong>`;
    }
    
    // Show popup dialog
    await PluginAPI.openDialog({
      title: 'Project Hours Summary',
      htmlContent: message,
      okBtnLabel: 'Close',
    });
    
  } catch (error) {
    console.error('Error calculating hours:', error);
    PluginAPI.showSnack({
      msg: 'Error calculating hours: ' + error.message,
      type: 'ERROR',
    });
  }
}

// register command to download hours report as PDF
PluginAPI.registerHeaderButton({
  id: 'my-header-btn', // Optional unique ID
  label: 'Click Me',
  icon: 'star', // Material icon name
  onClick: () => {
    downloadHoursPDF();
  },
});


// Download hours report as PDF
async function downloadHoursPDF() {
  try {
    // Get all tasks
    const tasks = await PluginAPI.getTasks();
    const archivedTasks = await PluginAPI.getArchivedTasks();
    const allTasks = [...tasks, ...archivedTasks];
    
    // Get all projects
    const projects = await PluginAPI.getAllProjects();
    
    // Get tasks from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Calculate hours per project
    const hoursPerProject = {};
    
    allTasks.forEach(task => {
      if (task.timeSpent && task.timeSpent > 0) {
        const taskDate = task.changed || task.created;
        if (taskDate && new Date(taskDate) > thirtyDaysAgo) {
          const projectId = task.projectId || 'No Project';
          const hours = task.timeSpent / (1000 * 60 * 60);
          
          if (!hoursPerProject[projectId]) {
            hoursPerProject[projectId] = 0;
          }
          hoursPerProject[projectId] += hours;
        }
      }
    });
    
    // Build PDF content
    const projectMap = {};
    projects.forEach(p => {
      projectMap[p.id] = p.title;
    });
    
    let totalHours = 0;
    const sortedProjects = Object.entries(hoursPerProject)
      .sort((a, b) => b[1] - a[1]);
    
    // Create simple PDF using text format
    let pdfContent = generateSimplePDF(sortedProjects, projectMap, totalHours);
    
    // Trigger download
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hours-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    PluginAPI.showSnack({
      msg: 'Hours report downloaded!',
      type: 'SUCCESS',
    });
    
  } catch (error) {
    console.error('Error downloading report:', error);
    PluginAPI.showSnack({
      msg: 'Error downloading report: ' + error.message,
      type: 'ERROR',
    });
  }
}

// Generate simple PDF content
function generateSimplePDF(sortedProjects, projectMap, totalHours) {
  let content = 'HOURS WORKED SUMMARY\n';
  content += '='.repeat(50) + '\n\n';
  content += `Report Generated: ${new Date().toLocaleString()}\n`;
  content += `Period: Last 30 Days\n\n`;
  
  if (sortedProjects.length === 0) {
    content += 'No time tracked in the last 30 days.\n';
  } else {
    content += 'PROJECT BREAKDOWN:\n';
    content += '-'.repeat(50) + '\n\n';
    
    sortedProjects.forEach(([projectId, hours]) => {
      const projectName = projectId === 'No Project' ? 'No Project' : (projectMap[projectId] || 'Unknown Project');
      content += `${projectName}: ${hours.toFixed(2)} hours\n`;
      totalHours += hours;
    });
    
    content += '\n' + '-'.repeat(50) + '\n';
    content += `TOTAL HOURS: ${totalHours.toFixed(2)}\n`;
  }
  
  return content;
}