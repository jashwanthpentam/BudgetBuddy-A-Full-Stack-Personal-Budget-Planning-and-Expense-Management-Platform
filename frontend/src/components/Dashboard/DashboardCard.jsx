function DashboardCard({ icon, title, value }) {
    return (
        <div className="card">

            <div className="card-header">

                <div className="card-icon">
                    {icon}
                </div>

                <h2>{title}</h2>

            </div>

            <h1>{value}</h1>

        </div>
    );
}

export default DashboardCard;
