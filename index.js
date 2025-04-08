const { google } = require('googleapis');
const nodemailer = require('nodemailer');

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
    keyFile: './debtflow-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // แทนด้วยอีเมลของคุณ
        pass: 'your-app-password', // ใช้ App Password จาก Gmail
    },
});

module.exports = async (req, res) => {
    const { method, body, query } = req;

    if (req.url === '/api/fetchTasks' && method === 'GET') {
        try {
            const authClient = await auth.getClient();
            const response = await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: 'Tasks!A2:L',
            });
            res.status(200).json({ values: response.data.values || [] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.url === '/api/fetchTaskDetails' && method === 'POST') {
        const { taskId } = body;
        if (!taskId) return res.status(400).json({ error: "Task ID is required" });

        try {
            const authClient = await auth.getClient();
            const response = await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: 'Tasks!A2:L',
            });

            const tasks = response.data.values || [];
            let task = null;
            let rowIndex = -1;

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i][0] === taskId) {
                    rowIndex = i + 2;
                    task = {
                        taskId: tasks[i][0] || '',
                        debtor: tasks[i][1] || '',
                        contractNo: tasks[i][2] || '',
                        principle: tasks[i][3] || '',
                        address: tasks[i][4] || '',
                        phone: tasks[i][5] || '',
                        brand: tasks[i][6] || '',
                        model: tasks[i][7] || '',
                        status: tasks[i][8] || '',
                        note: tasks[i][9] || '',
                        lastUpdated: tasks[i][10] || '',
                        attachment: tasks[i][11] || '',
                        rowIndex: rowIndex,
                    };
                    break;
                }
            }

            if (!task) return res.status(404).json({ error: "Task not found" });
            res.status(200).json(task);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.url === '/api/updateTaskStatus' && method === 'POST') {
        const { taskId, status } = body;
        if (!taskId || !status) return res.status(400).json({ error: "Task ID and status are required" });

        try {
            const authClient = await auth.getClient();
            const response = await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: 'Tasks!A2:L',
            });

            const tasks = response.data.values || [];
            let rowIndex = -1;

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i][0] === taskId) {
                    rowIndex = i + 2;
                    break;
                }
            }

            if (rowIndex === -1) return res.status(404).json({ error: "Task not found" });

            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: `Tasks!I${rowIndex}`,
                valueInputOption: 'RAW',
                resource: { values: [[status]] },
            });

            await transporter.sendMail({
                from: 'your-email@gmail.com',
                to: 'tongapplid@gmail.com',
                subject: 'DebtFlow: Task Status Updated',
                text: `Task ${taskId} status updated to ${status} at ${new Date().toLocaleString()}.`,
            });

            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else if (req.url === '/api/saveAdditionalDetails' && method === 'POST') {
        const { taskId, data } = body;
        if (!taskId || !data) return res.status(400).json({ error: "Task ID and data are required" });

        try {
            const authClient = await auth.getClient();
            const response = await sheets.spreadsheets.values.get({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: 'Tasks!A2:L',
            });

            const tasks = response.data.values || [];
            let rowIndex = -1;

            for (let i = 0; i < tasks.length; i++) {
                if (tasks[i][0] === taskId) {
                    rowIndex = i + 2;
                    break;
                }
            }

            if (rowIndex === -1) return res.status(404).json({ error: "Task not found" });

            await sheets.spreadsheets.values.update({
                auth: authClient,
                spreadsheetId: '1anUGI1NyL33MxBJbkx-rbc38UEndbQbiR-YjZlAO_B4',
                range: `Tasks!A${rowIndex}:L${rowIndex}`,
                valueInputOption: 'RAW',
                resource: { values: [data] },
            });

            await transporter.sendMail({
                from: 'your-email@gmail.com',
                to: 'tongapplid@gmail.com',
                subject: 'DebtFlow: Task Details Updated',
                text: `Task ${taskId} details updated at ${new Date().toLocaleString()}.`,
            });

            res.status(200).json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(404).json({ error: "Not found" });
    }
};
